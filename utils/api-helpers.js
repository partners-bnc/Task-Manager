/**
 * Shared server-side API helpers for auth, date normalization, and subtask sync.
 * Eliminates duplication across route handlers.
 */

import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'employee_session';

// ─── Admin Auth Guard ────────────────────────────────────────────────────────

/**
 * Verifies the request is from an authenticated admin user.
 * Returns { supabase, user } on success or a NextResponse error.
 */
export async function requireAdmin(request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }

    return { supabase, user };
}

/**
 * Verifies the request is from an authenticated admin or employee actor.
 * Returns { supabase, actor } on success or a NextResponse error.
 */
export async function requireTaskManager(request) {
    const actor = await getActor(request);

    if (!actor) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    if (actor.type !== 'admin' && actor.type !== 'employee') {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }

    return { supabase: adminClient, actor };
}

// ─── Actor Resolution (admin or employee) ────────────────────────────────────

/**
 * Resolves the current actor from either Supabase Auth (admin) or employee session cookie.
 * Returns an actor object or null.
 */
export async function getActor(request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role === 'admin') {
            return {
                type: 'admin',
                userId: user.id,
                name: user.email || 'Admin',
                avatarUrl: user.user_metadata?.avatar_url || null,
            };
        }
    }

    const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
    if (!sessionToken) {
        return null;
    }

    const { data: session, error } = await adminClient
        .from('employee_sessions')
        .select('employee_id, expires_at, employee:employees(id, name, profile_picture_url)')
        .eq('token', sessionToken)
        .single();

    if (error || !session) {
        return null;
    }

    if (new Date(session.expires_at).getTime() <= Date.now()) {
        await adminClient.from('employee_sessions').delete().eq('token', sessionToken);
        return null;
    }

    return {
        type: 'employee',
        employeeId: session.employee_id,
        name: session.employee?.name || 'Employee',
        avatarUrl: session.employee?.profile_picture_url || null,
    };
}

// ─── Task Access Check ───────────────────────────────────────────────────────

/**
 * Checks whether the given actor has access to a specific task.
 * Admins always have access; employees only if assigned.
 */
export async function hasTaskAccess(taskId, actor) {
    if (!actor) return false;
    if (actor.type === 'admin') return true;

    const { data: assignment, error } = await adminClient
        .from('task_assignments')
        .select('task_id')
        .eq('task_id', taskId)
        .eq('employee_id', actor.employeeId)
        .single();

    return !error && !!assignment;
}

// ─── Date Normalization ──────────────────────────────────────────────────────

/**
 * Normalizes a date input to an ISO string. Returns null for invalid/empty values.
 */
export function normalizeDueDate(input) {
    if (!input) return null;
    const parsedDate = new Date(input);
    if (Number.isNaN(parsedDate.getTime())) return null;
    return parsedDate.toISOString();
}

// ─── Subtask Sync ────────────────────────────────────────────────────────────

/**
 * Normalizes subtask input: accepts strings or objects with
 * { id, title, is_completed, assigned_employee_id }.
 */
export function normalizeSubtasks(input) {
    if (!Array.isArray(input)) return [];
    return input
        .map((subtask) => {
            if (typeof subtask === 'string') {
                return { title: subtask.trim(), is_completed: false };
            }
            return {
                id: subtask?.id,
                title: String(subtask?.title || '').trim(),
                is_completed: Boolean(subtask?.is_completed),
                assigned_employee_id: subtask?.assigned_employee_id || null,
            };
        })
        .filter((subtask) => subtask.title.length > 0);
}

/**
 * Syncs subtasks for a task: deletes removed, inserts new, updates changed.
 */
export async function syncTaskSubtasks(supabase, taskId, subtasks) {
    const { data: existingSubtasks, error: existingSubtasksError } = await supabase
        .from('task_subtasks')
        .select('id, title, is_completed, assigned_employee_id')
        .eq('task_id', taskId);

    if (existingSubtasksError) {
        throw new Error(existingSubtasksError.message);
    }

    const existingById = new Map((existingSubtasks || []).map((s) => [s.id, s]));
    const incomingWithId = subtasks.filter((s) => s.id);
    const incomingIds = new Set(incomingWithId.map((s) => s.id));

    // Delete removed subtasks
    const toDeleteIds = (existingSubtasks || [])
        .filter((s) => !incomingIds.has(s.id))
        .map((s) => s.id);

    if (toDeleteIds.length > 0) {
        const { error: deleteError } = await supabase
            .from('task_subtasks')
            .delete()
            .eq('task_id', taskId)
            .in('id', toDeleteIds);
        if (deleteError) throw new Error(deleteError.message);
    }

    // Insert new subtasks
    const toInsert = subtasks
        .filter((s) => !s.id)
        .map((s) => ({
            task_id: taskId,
            title: s.title,
            is_completed: !!s.is_completed,
            assigned_employee_id: s.assigned_employee_id || null,
        }));

    if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from('task_subtasks').insert(toInsert);
        if (insertError) throw new Error(insertError.message);
    }

    // Update changed subtasks
    const toUpdate = incomingWithId.filter((s) => {
        const existing = existingById.get(s.id);
        if (!existing) return false;
        return !(
            existing.title === s.title &&
            existing.is_completed === !!s.is_completed &&
            (existing.assigned_employee_id || null) === (s.assigned_employee_id || null)
        );
    });

    if (toUpdate.length > 0) {
        const now = new Date().toISOString();
        const results = await Promise.all(
            toUpdate.map((s) =>
                supabase
                    .from('task_subtasks')
                    .update({
                        title: s.title,
                        is_completed: !!s.is_completed,
                        assigned_employee_id: s.assigned_employee_id || null,
                        updated_at: now,
                    })
                    .eq('id', s.id)
                    .eq('task_id', taskId)
            )
        );
        for (const result of results) {
            if (result.error) throw new Error(result.error.message);
        }
    }
}
