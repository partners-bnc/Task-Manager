import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const HR_ADMINS = [
  {
    employeeCode: 'HRA001',
    name: 'Neha Srivastava',
    email: 'neha@bncglobal.in',
    password: 'neha@bnc123',
    phone: '8923125988',
    department: 'Talent Acquisition',
    designation: 'Senior Consultant-TA & HR',
  },
  {
    employeeCode: 'HRA002',
    name: 'Karanpreet Kaur',
    email: 'karanpreet@bncglobal.in',
    password: 'karan@bnc123',
    phone: '8882646530',
    department: 'Talent Acquisition',
    designation: 'Senior Recruitment',
  },
  {
    employeeCode: 'HRA003',
    name: 'Shailvi Soni',
    email: 'shailvibncglobal@gmail.com',
    password: 'shailvi@bnc123',
    phone: '9516739861',
    department: 'Talent Acquisition',
    designation: 'Senior Recruitment',
  },
  {
    employeeCode: 'HRA004',
    name: 'Payal',
    email: 'payal.bncglobal@gmail.com',
    password: 'payal@bnc123',
    phone: '9730610109',
    department: 'Talent Acquisition',
    designation: 'Recruitment',
  },
  {
    employeeCode: 'HRA005',
    name: 'Akriti Nigam',
    email: 'akritinigam7890@gmail.com',
    password: 'akriti@bnc123',
    phone: '9621896900',
    department: 'Talent Acquisition',
    designation: 'Intern',
  },
];

function usernameFromEmail(email) {
  return String(email || '').trim().toLowerCase().split('@')[0] || '';
}

async function ensureDepartment(name) {
  const { data: existing, error: existingError } = await supabase
    .from('hrm_departments')
    .select('id')
    .ilike('name', name)
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing.id;

  const { data: created, error: createError } = await supabase
    .from('hrm_departments')
    .insert({ name, description: `${name} department`, is_active: true })
    .select('id')
    .single();

  if (createError) throw createError;
  return created.id;
}

async function ensureDesignation(title, departmentId) {
  const { data: existing, error: existingError } = await supabase
    .from('hrm_designations')
    .select('id')
    .ilike('title', title)
    .eq('department_id', departmentId)
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing.id;

  const { data: created, error: createError } = await supabase
    .from('hrm_designations')
    .insert({ title, department_id: departmentId, is_active: true })
    .select('id')
    .single();

  if (createError) throw createError;
  return created.id;
}

async function findAuthUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((user) => String(user.email || '').toLowerCase() === email.toLowerCase()) || null;
}

async function ensureAuthUser(admin) {
  const existing = await findAuthUserByEmail(admin.email);

  if (existing?.id) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      email: admin.email,
      password: admin.password,
      email_confirm: true,
      user_metadata: {
        full_name: admin.name,
        role: 'hr_admin',
      },
    });

    if (updateError) throw updateError;
    return existing.id;
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: admin.email,
    password: admin.password,
    email_confirm: true,
    user_metadata: {
      full_name: admin.name,
      role: 'hr_admin',
    },
  });

  if (createError) throw createError;
  return created.user.id;
}

async function ensureEmployee(admin, authUserId, departmentId, designationId) {
  const passwordHash = await bcrypt.hash(admin.password, 10);
  const { data: existing, error: existingError } = await supabase
    .from('hrm_employees')
    .select('id')
    .eq('email', admin.email)
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  const payload = {
    employee_id: admin.employeeCode,
    name: admin.name,
    username: usernameFromEmail(admin.email),
    email: admin.email,
    role: admin.designation,
    password_hash: passwordHash,
    must_change_password: false,
    password_set_at: new Date().toISOString(),
    auth_user_id: authUserId,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data: updated, error: updateError } = await supabase
      .from('hrm_employees')
      .update(payload)
      .eq('id', existing.id)
      .select('id')
      .single();

    if (updateError) throw updateError;

    await supabase.from('hrm_employee_profiles').upsert(
      {
        employee_id: updated.id,
        department_id: departmentId,
        designation_id: designationId,
        phone1: admin.phone,
        mobile: admin.phone,
        joined_on: new Date().toISOString().slice(0, 10),
        employment_status: 'confirmed',
        company: 'BNC Global',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'employee_id' }
    );

    await supabase.from('hrm_module_access').upsert(
      {
        employee_id: updated.id,
        task_manager: true,
        task_manager_role: 'admin',
        auditing: false,
        crm: false,
        hrm_admin: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'employee_id' }
    );

    return updated.id;
  }

  const { data: created, error: createError } = await supabase
    .from('hrm_employees')
    .insert(payload)
    .select('id')
    .single();

  if (createError) throw createError;

  await supabase.from('hrm_employee_profiles').insert({
    employee_id: created.id,
    department_id: departmentId,
    designation_id: designationId,
    phone1: admin.phone,
    mobile: admin.phone,
    joined_on: new Date().toISOString().slice(0, 10),
    employment_status: 'confirmed',
    company: 'BNC Global',
  });

  await supabase.from('hrm_module_access').insert({
    employee_id: created.id,
    task_manager: true,
    task_manager_role: 'admin',
    auditing: false,
    crm: false,
    hrm_admin: true,
  });

  return created.id;
}

async function ensureProfile(authUserId, admin) {
  const { error } = await supabase.from('hrm_profiles').upsert(
    {
      id: authUserId,
      email: admin.email,
      role: 'hr_admin',
      full_name: admin.name,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) throw error;
}

async function main() {
  for (const admin of HR_ADMINS) {
    const departmentId = await ensureDepartment(admin.department);
    const designationId = await ensureDesignation(admin.designation, departmentId);
    const authUserId = await ensureAuthUser(admin);
    await ensureProfile(authUserId, admin);
    await ensureEmployee(admin, authUserId, departmentId, designationId);
    console.log(`Seeded HR admin: ${admin.email}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

