/**
 * Shared UI helper functions used across admin, dashboard, and task detail pages.
 * Centralizes badge styling, date formatting, subtask progress, and initials logic.
 */

// ─── Status Badge ────────────────────────────────────────────────────────────

const STATUS_BADGES = {
    pending: { className: 'bg-[rgba(192,57,43,0.12)] text-[#a0311f] border border-[rgba(192,57,43,0.25)]', label: 'Pending' },
    in_progress: { className: 'bg-[rgba(200,134,10,0.12)] text-[#b37508] border border-[rgba(200,134,10,0.25)]', label: 'In Progress' },
    completed: { className: 'bg-[rgba(26,158,80,0.12)] text-[#157a42] border border-[rgba(26,158,80,0.25)]', label: 'Completed' },
};

/**
 * Returns { className, label } for a given task status.
 * Falls back to 'pending' if unknown.
 */
export function getStatusBadge(status) {
    return STATUS_BADGES[status] || STATUS_BADGES.pending;
}

// ─── Priority Badge ──────────────────────────────────────────────────────────

const PRIORITY_BADGES = {
    low: 'bg-[rgba(42,114,195,0.12)] text-[#1a5a9a] border border-[rgba(42,114,195,0.25)]',
    medium: 'bg-[rgba(200,134,10,0.12)] text-[#b37508] border border-[rgba(200,134,10,0.25)]',
    high: 'bg-[rgba(192,57,43,0.12)] text-[#a0311f] border border-[rgba(192,57,43,0.25)]',
};

/**
 * Returns a Tailwind class string for a given priority level.
 * Falls back to 'medium' if unknown.
 */
export function getPriorityBadge(priority) {
    return PRIORITY_BADGES[priority] || PRIORITY_BADGES.medium;
}

// ─── Priority Accent (marker / progress colors) ─────────────────────────────

const PRIORITY_ACCENTS = {
    low: { marker: 'bg-[var(--blue)]', progress: 'bg-[var(--blue)]' },
    medium: { marker: 'bg-[var(--accent)]', progress: 'bg-[var(--accent)]' },
    high: { marker: 'bg-[var(--red)]', progress: 'bg-[var(--red)]' },
};

export function getPriorityAccent(priority) {
    return PRIORITY_ACCENTS[priority] || PRIORITY_ACCENTS.medium;
}

// ─── Subtask Progress ────────────────────────────────────────────────────────

/**
 * Returns { total, completed } counts from a task's task_subtasks array.
 */
export function getTaskDoneCounts(task) {
    const subtasks = Array.isArray(task?.task_subtasks) ? task.task_subtasks : [];
    const total = subtasks.length;
    const completed = subtasks.filter((s) => s.is_completed).length;
    return { total, completed: Math.min(completed, total || completed) };
}

/**
 * Returns an integer 0-100 representing progress percentage.
 */
export function getProgressPercent(completed, total) {
    if (!total || total <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

// ─── Date Formatting ─────────────────────────────────────────────────────────

/**
 * Formats a date value to "Jan 1, 2026" style. Returns '--' for invalid/empty input.
 */
export function formatDate(input) {
    if (!input) return '--';
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Formats a date value to include time: "Jan 1, 2026, 3:30 PM".
 */
export function formatDateTime(input) {
    if (!input) return '--';
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

/**
 * Returns an ISO date string suitable for <input type="date"> value attributes.
 */
export function formatDateInputValue(input) {
    if (!input) return '';
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
}

// ─── Initials ────────────────────────────────────────────────────────────────

/**
 * Extracts up to 2 uppercase initials from a name string. Defaults to 'U'.
 */
export function getInitials(name) {
    const base = String(name || 'U').trim();
    if (!base) return 'U';
    return base
        .split(' ')
        .filter(Boolean)
        .map((token) => token[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
}
