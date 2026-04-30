import { adminClient } from '@/utils/supabase/admin';
import { deriveEmploymentFields } from '@/utils/hrm-employment';

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
  const unassignedNodeId = buildGroupNodeId('unassigned');
  let hasUnassignedEmployees = false;

  nodes.set(unassignedNodeId, {
    id: unassignedNodeId,
    entityId: 'unassigned',
    kind: 'group',
    name: 'Unassigned / Reporting Not Set',
    employeeId: null,
    title: 'Needs reporting mapping',
    avatarUrl: null,
    parentId: null,
    childIds: [],
    directReportCount: 0,
    status: 'attention',
  });

  const superAdminNodeIds = new Set(superAdmins.map((item) => buildSuperAdminNodeId(item.id)));

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

    hasUnassignedEmployees = true;
    attachChild(nodes, unassignedNodeId, childNodeId);
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

  if (hasUnassignedEmployees) {
    roots.push(unassignedNodeId);
  } else {
    nodes.delete(unassignedNodeId);
  }

  return {
    roots,
    nodes: Array.from(nodes.values()).map((node) => ({
      ...node,
      reportingManagerId: undefined,
      reportingSuperAdminId: undefined,
    })),
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
      .from('super_admins')
      .select('id, name, email, status, designation, profile_picture_url')
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
  const employees = (employeesResult.data || []).map((employee) => ({
    ...employee,
    reporting_super_admin_id: reportingSuperAdminSupported ? employee.reporting_super_admin_id || null : null,
    employment_lifecycle_status: lifecycleSupported ? employee.employment_lifecycle_status || null : null,
    current_stage: currentStageSupported ? employee.current_stage || null : null,
  }));

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
