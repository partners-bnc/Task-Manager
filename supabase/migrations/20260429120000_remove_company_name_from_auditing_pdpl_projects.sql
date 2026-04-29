update public.auditing_pdpl_projects
set client_name = company_name
where coalesce(btrim(client_name), '') = ''
  and coalesce(btrim(company_name), '') <> '';

drop index if exists public.auditing_pdpl_projects_company_idx;

alter table if exists public.auditing_pdpl_projects
  drop column if exists company_name;
