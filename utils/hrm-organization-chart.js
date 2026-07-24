import { adminClient } from '@/utils/supabase/admin';
import { deriveEmploymentFields } from '@/utils/hrm-employment';

const isSuperAdminEntity = (emp) => {
  if (!emp) return false;
  if (emp.email && ['summit@bncglobal.in', 'gurvinder@bncglobal.in'].includes(emp.email.toLowerCase().trim())) {
    return true;
  }
  if (emp.employee_id) {
    const empIdUpper = String(emp.employee_id).toUpperCase().trim();
    if (empIdUpper.startsWith('SA-') || empIdUpper.startsWith('SA0') || ['SA01', 'SA02', 'SA-01', 'SA-02'].includes(empIdUpper)) {
      return true;
    }
  }
  return false;
};

const hrmEmployeeColumnSupportPromises = new Map();

function cleanText(value) {
  const normalized = String(value || '').trim();
  return normalized || '';
}

async function supportsHrmEmployeeColumn(columnName) {
  if (!hrmEmployeeColumnSupportPromises.has(columnName)) {
    const promise = (async () => {
      const infoSchemaResult = await adminClient
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'hrm_employees')
        .eq('column_name', columnName)
        .limit(1);

      if (!infoSchemaResult.error && infoSchemaResult.data?.length) {
        return true;
      }

      const probeResult = await adminClient.from('hrm_employees').select(columnName).limit(1);

      if (!probeResult.error) {
        return true;
      }

      const message = cleanText(probeResult.error?.message).toLowerCase();
      return !(
        message.includes('could not find') ||
        message.includes('column') ||
        message.includes('schema cache') ||
        message.includes('does not exist')
      );
    })().catch(() => false);

    hrmEmployeeColumnSupportPromises.set(columnName, promise);
  }

  const supported = await hrmEmployeeColumnSupportPromises.get(columnName);

  if (!supported) {
    hrmEmployeeColumnSupportPromises.delete(columnName);
  }

  return supported;
}

function buildEmployeeNodeId(id) {
  return `employee:${id}`;
}

function buildSuperAdminNodeId(id) {
  return `super_admin:${id}`;
}

function buildGroupNodeId(id) {
  return `group:${id}`;
}

function compareByName(a, b) {
  return cleanText(a?.name).localeCompare(cleanText(b?.name), 'en', { sensitivity: 'base' });
}

function getSuperAdminDisplayPriority(superAdmin) {
  const designation = cleanText(superAdmin?.designation).toLowerCase();

  if (designation === 'founder') return 0;
  if (designation === 'co-founder' || designation === 'cofounder') return 1;
  return 2;
}

function compareSuperAdmins(left, right) {
  const priorityDifference = getSuperAdminDisplayPriority(left) - getSuperAdminDisplayPriority(right);
  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return compareByName(left, right);
}

function getNodeTitle(employee) {
  return (
    cleanText(employee?.designation?.title) ||
    cleanText(employee?.role) ||
    cleanText(employee?.department?.name) ||
    'Employee'
  );
}

function createNodeMap(superAdmins, employees) {
  const nodes = new Map();

  superAdmins.forEach((superAdmin) => {
    const nodeId = buildSuperAdminNodeId(superAdmin.id);
    nodes.set(nodeId, {
      id: nodeId,
      entityId: superAdmin.id,
      kind: 'super_admin',
      name: cleanText(superAdmin.name) || cleanText(superAdmin.email) || 'Super Admin',
      employeeId: null,
      title: cleanText(superAdmin.designation) || 'Executive Level',
      avatarUrl: cleanText(superAdmin.profile_picture_url) || null,
      parentId: null,
      childIds: [],
      directReportCount: 0,
      status: cleanText(superAdmin.status) || 'active',
      email: cleanText(superAdmin.email),
      phone: null,
      dateOfJoining: superAdmin.created_at || null,
    });
  });

  employees.forEach((employee) => {
    const nodeId = buildEmployeeNodeId(employee.id);
    const employment = deriveEmploymentFields(employee);
    nodes.set(nodeId, {
      id: nodeId,
      entityId: employee.id,
      kind: 'employee',
      name: cleanText(employee.name) || cleanText(employee.email) || 'Employee',
      employeeId: cleanText(employee.employee_id) || null,
      title: getNodeTitle(employee),
      avatarUrl: cleanText(employee.profile_picture_url) || null,
      parentId: null,
      childIds: [],
      directReportCount: 0,
      status: employment.employmentLifecycleStatus || 'active',
      reportingManagerId: employee.reporting_manager_id || null,
      reportingSuperAdminId: employee.reporting_super_admin_id || null,
      departmentId: employee.department?.id || null,
      departmentName: employee.department?.name || 'Other',
      email: cleanText(employee.email),
      phone: cleanText(employee.phone) || cleanText(employee.mobile_phone) || null,
      dateOfJoining: employee.date_of_joining || null,
    });
  });

  return nodes;
}

function attachChild(nodes, parentId, childId) {
  const parent = nodes.get(parentId);
  const child = nodes.get(childId);

  if (!parent || !child) {
    return false;
  }

  if (!parent.childIds.includes(childId)) {
    parent.childIds.push(childId);
  }

  child.parentId = parentId;
  return true;
}

function wouldCreateCycle(nodes, parentId, childId) {
  let currentId = parentId;

  while (currentId) {
    if (currentId === childId) {
      return true;
    }

    currentId = nodes.get(currentId)?.parentId || null;
  }

  return false;
}

function buildOrganizationTree(superAdmins, employees) {
  const visibleManagerIds = new Set(
    employees
      .map((employee) => employee.reporting_manager_id)
      .filter(Boolean)
  );
  const scopedEmployees = employees.filter((employee) => {
    const lifecycleStatus = deriveEmploymentFields(employee).employmentLifecycleStatus;
    return lifecycleStatus !== 'separated' || visibleManagerIds.has(employee.id);
  });
  const nodes = createNodeMap(superAdmins, employees);
  const superAdminNodeIds = new Set(superAdmins.map((item) => buildSuperAdminNodeId(item.id)));
  const primarySuperAdminId = superAdmins.length > 0 ? buildSuperAdminNodeId(superAdmins[0].id) : null;

  scopedEmployees.forEach((employee) => {
    const childNodeId = buildEmployeeNodeId(employee.id);
    const managerNodeId = employee.reporting_manager_id ? buildEmployeeNodeId(employee.reporting_manager_id) : null;
    const superAdminNodeId = employee.reporting_super_admin_id
      ? buildSuperAdminNodeId(employee.reporting_super_admin_id)
      : null;

    if (
      managerNodeId &&
      nodes.has(managerNodeId) &&
      managerNodeId !== childNodeId &&
      !wouldCreateCycle(nodes, managerNodeId, childNodeId)
    ) {
      attachChild(nodes, managerNodeId, childNodeId);
      return;
    }

    if (superAdminNodeId && superAdminNodeIds.has(superAdminNodeId)) {
      attachChild(nodes, superAdminNodeId, childNodeId);
      return;
    }

    // Attach to the primary super admin instead of creating an unassigned group
    if (primarySuperAdminId) {
      attachChild(nodes, primarySuperAdminId, childNodeId);
      return;
    }
  });

  nodes.forEach((node) => {
    node.childIds.sort((leftId, rightId) => compareByName(nodes.get(leftId), nodes.get(rightId)));
    node.directReportCount = node.childIds.length;
  });

  Array.from(nodes.values()).forEach((node) => {
    if (node.kind === 'employee' && !scopedEmployees.some((employee) => buildEmployeeNodeId(employee.id) === node.id)) {
      nodes.delete(node.id);
    }
  });

  const roots = superAdmins
    .slice()
    .sort(compareSuperAdmins)
    .map((superAdmin) => buildSuperAdminNodeId(superAdmin.id));

  return {
    roots,
    nodes: Array.from(nodes.values()),
  };
}

export async function loadOrganizationChartData() {
  const reportingSuperAdminSupported = await supportsHrmEmployeeColumn('reporting_super_admin_id');
  const lifecycleSupported = await supportsHrmEmployeeColumn('employment_lifecycle_status');
  const currentStageSupported = await supportsHrmEmployeeColumn('current_stage');

  const employeeSelect = `
    id,
    employee_id,
    name,
    email,
    role,
    profile_picture_url,
    employee_status,
    reporting_manager_id,
    phone,
    mobile_phone,
    date_of_joining,
    ${reportingSuperAdminSupported ? 'reporting_super_admin_id,' : ''}
    ${lifecycleSupported ? 'employment_lifecycle_status,' : ''}
    ${currentStageSupported ? 'current_stage,' : ''}
    department:hrm_departments (
      id,
      name
    ),
    designation:hrm_designations (
      id,
      title
    )
  `;

  const [superAdminsResult, employeesResult] = await Promise.all([
    adminClient
      .from('privileged_accounts')
      .select('id, auth_user_id, name, email, status, designation, profile_picture_url, created_at')
      .eq('role', 'super_admin')
      .order('name', { ascending: true }),
    adminClient
      .from('hrm_employees')
      .select(employeeSelect)
      .order('name', { ascending: true }),
  ]);

  if (superAdminsResult.error) {
    throw new Error(superAdminsResult.error.message || 'Failed to load super admins');
  }

  if (employeesResult.error) {
    throw new Error(employeesResult.error.message || 'Failed to load employees');
  }

  const superAdmins = superAdminsResult.data || [];
  const employees = (employeesResult.data || [])
    .map((employee) => ({
      ...employee,
      reporting_super_admin_id: reportingSuperAdminSupported ? employee.reporting_super_admin_id || null : null,
      employment_lifecycle_status: lifecycleSupported ? employee.employment_lifecycle_status || null : null,
      current_stage: currentStageSupported ? employee.current_stage || null : null,
    }))
    .filter((emp) => !isSuperAdminEntity(emp));

  const chart = buildOrganizationTree(superAdmins, employees);

  return {
    success: true,
    metadata: {
      rootCount: chart.roots.length,
      superAdminCount: superAdmins.length,
      employeeCount: chart.nodes.filter((node) => node.kind === 'employee').length,
      reportingSuperAdminSupported,
      generatedAt: new Date().toISOString(),
    },
    ...chart,
  };
}
