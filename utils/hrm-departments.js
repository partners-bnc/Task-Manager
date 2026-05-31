export const HRM_ALLOWED_DEPARTMENTS = [
  'International Collaborations & Partnerships',
  'Consulting - Financial Advisory',
  'HR & Global Hirings',
  'Marketing & Branding',
  'Accounts & Finance',
  'Consulting - HR',
  'Cyber Security',
  'AI Automation',
  'IT & Internal Control',
];

export const HRM_DEPARTMENT_SET = new Set(HRM_ALLOWED_DEPARTMENTS);

export function filterAllowedHrmDepartments(departments = []) {
  return departments.filter((department) => HRM_DEPARTMENT_SET.has(String(department?.name || '').trim()));
}

export function mergeAllowedHrmDepartments(departments = []) {
  const byName = new Map(
    departments
      .filter((department) => department && HRM_DEPARTMENT_SET.has(String(department?.name || '').trim()))
      .map((department) => [String(department.name).trim(), department])
  );

  return HRM_ALLOWED_DEPARTMENTS.map((name) => byName.get(name) || { id: name, name });
}
