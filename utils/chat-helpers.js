import { adminClient } from '@/utils/supabase/admin';
import { getActor, getActorKey, parseActorKey } from '@/utils/api-helpers';

function sanitizeSearchText(value) {
  return String(value || '').replace(/[,]/g, ' ').trim();
}

function mapAdminProfileToChatUser(profile) {
  return {
    key: `admin:${profile.id}`,
    type: 'admin',
    id: profile.id,
    name: profile.full_name || (profile.email ? profile.email.split('@')[0] : 'Admin'),
    email: profile.email || '',
    avatarUrl: '',
  };
}

function mapEmployeeToChatUser(employee) {
  return {
    key: `employee:${employee.id}`,
    type: 'employee',
    id: employee.id,
    name: employee.name || (employee.email ? employee.email.split('@')[0] : 'Employee'),
    email: employee.email || '',
    avatarUrl: employee.profile_picture_url || '',
  };
}

export async function getChatActor(request) {
  const actor = await getActor(request);
  if (!actor) return null;
  if (actor.type === 'employee' && !actor.authUserId) return null;

  const actorKey = getActorKey(actor);
  if (!actorKey) return null;

  return {
    actor,
    actorKey,
    user: {
      key: actorKey,
      type: actor.type,
      id: actor.type === 'admin' ? actor.userId : actor.employeeId,
      name: actor.name || '',
      email: actor.email || '',
      avatarUrl: actor.avatarUrl || '',
    },
  };
}

export async function getChatUserByKey(actorKey) {
  const parsed = parseActorKey(actorKey);
  if (!parsed) return null;

  if (parsed.type === 'admin') {
    const { data } = await adminClient
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', parsed.id)
      .eq('role', 'admin')
      .maybeSingle();

    return data ? mapAdminProfileToChatUser(data) : null;
  }

  const { data } = await adminClient
    .from('employees')
    .select('id, name, email, profile_picture_url')
    .eq('id', parsed.id)
    .maybeSingle();

  return data ? mapEmployeeToChatUser(data) : null;
}

export async function searchChatUsers({ query, excludeKey, limit = 25 }) {
  const text = sanitizeSearchText(query);

  let adminQuery = adminClient
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('role', 'admin')
    .limit(limit);

  let employeeQuery = adminClient
    .from('employees')
    .select('id, name, email, profile_picture_url')
    .limit(limit);

  if (text) {
    const pattern = `%${text}%`;
    adminQuery = adminQuery.or(`full_name.ilike.${pattern},email.ilike.${pattern}`);
    employeeQuery = employeeQuery.or(`name.ilike.${pattern},email.ilike.${pattern}`);
  }

  const [{ data: admins = [] }, { data: employees = [] }] = await Promise.all([
    adminQuery,
    employeeQuery,
  ]);

  const users = [...admins.map(mapAdminProfileToChatUser), ...employees.map(mapEmployeeToChatUser)]
    .filter((user) => user.key !== excludeKey)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);

  return users;
}

export function derivePeerKey(thread, selfKey) {
  if (!thread) return null;
  if (thread.participant_a_key === selfKey) return thread.participant_b_key;
  if (thread.participant_b_key === selfKey) return thread.participant_a_key;
  return null;
}
