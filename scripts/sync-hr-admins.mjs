import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const HR_ADMINS = [
  {
    srNo: 1,
    name: 'Neha Srivastava',
    email: 'neha@bncglobal.in',
    password: 'neha@bnc123',
    phone: '8923125988',
    department: 'Talent Acquisition',
    designation: 'Senior Consultant-TA & HR',
    status: 'Active',
  },
  {
    srNo: 2,
    name: 'Karanpreet Kaur',
    email: 'karanpreet@bncglobal.in',
    password: 'karan@bnc123',
    phone: '8882646530',
    department: 'Talent Acquisition',
    designation: 'Senior Recruitment',
    status: 'Active',
  },
  {
    srNo: 3,
    name: 'Shailvi Soni',
    email: 'shailvibncglobal@gmail.com',
    password: 'shailvi@bnc123',
    phone: '9516739861',
    department: 'Talent Acquisition',
    designation: 'Senior Recruitment',
    status: 'Active',
  },
  {
    srNo: 4,
    name: 'Payal',
    email: 'payal.bncglobal@gmail.com',
    password: 'payal@bnc123',
    phone: '9730610109',
    department: 'Talent Acquisition',
    designation: 'Recruitment',
    status: 'Active',
  },
  {
    srNo: 5,
    name: 'Akriti Nigam',
    email: 'akritinigam7890@gmail.com',
    password: 'akriti@bnc123',
    phone: '9621896900',
    department: 'Talent Acquisition',
    designation: 'Intern',
    status: 'Active',
  },
];

async function findAuthUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    throw new Error(error.message || `Failed to list auth users for ${email}`);
  }

  return (data?.users || []).find((user) => String(user.email || '').toLowerCase() === email.toLowerCase()) || null;
}

async function ensureDepartmentId(name) {
  const { data, error } = await supabase
    .from('hrm_departments')
    .select('id')
    .ilike('name', name)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || `Failed to find department ${name}`);
  }

  if (!data?.id) {
    throw new Error(`Department not found: ${name}`);
  }

  return data.id;
}

async function ensureDesignationId(title, departmentId) {
  const { data, error } = await supabase
    .from('hrm_designations')
    .select('id')
    .ilike('title', title)
    .eq('department_id', departmentId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || `Failed to find designation ${title}`);
  }

  if (!data?.id) {
    throw new Error(`Designation not found: ${title}`);
  }

  return data.id;
}

async function ensureAuthUser(admin) {
  let authUser = await findAuthUserByEmail(admin.email);

  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true,
      user_metadata: {
        full_name: admin.name,
        role: 'hr_admin',
      },
    });

    if (error || !data?.user?.id) {
      throw new Error(error?.message || `Failed to create auth user for ${admin.email}`);
    }

    authUser = data.user;
  } else {
    const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
      email: admin.email,
      password: admin.password,
      email_confirm: true,
      user_metadata: {
        full_name: admin.name,
        role: 'hr_admin',
      },
    });

    if (error) {
      throw new Error(error.message || `Failed to sync auth user for ${admin.email}`);
    }
  }

  return authUser.id;
}

for (const admin of HR_ADMINS) {
  const authUserId = await ensureAuthUser(admin);
  const departmentId = await ensureDepartmentId(admin.department);
  const designationId = await ensureDesignationId(admin.designation, departmentId);
  const passwordHash = await bcrypt.hash(admin.password, 10);

  const { error: profileError } = await supabase.from('hrm_profiles').upsert(
    {
      id: authUserId,
      email: admin.email.toLowerCase(),
      full_name: admin.name,
      role: 'hr_admin',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    throw new Error(profileError.message || `Failed to upsert profile for ${admin.email}`);
  }

  const { error: hrAdminError } = await supabase.from('hr_admins').upsert(
    {
      sr_no: admin.srNo,
      auth_user_id: authUserId,
      email: admin.email.toLowerCase(),
      name: admin.name,
      phone: admin.phone,
      department_id: departmentId,
      designation_id: designationId,
      status: admin.status,
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'email' }
  );

  if (hrAdminError) {
    throw new Error(hrAdminError.message || `Failed to upsert hr_admin row for ${admin.email}`);
  }

  console.log(`Synced HR admin ${admin.email}`);
}

console.log('HR admin sync complete.');

