create index if not exists auditing_pdpl_projects_updated_idx
  on public.auditing_pdpl_projects(updated_at desc);

create index if not exists auditing_pdpl_project_members_employee_assigned_idx
  on public.auditing_pdpl_project_members(employee_id, assigned_at desc);
