-- Add email_format column to crm_campaigns table
alter table public.crm_campaigns
  add column if not exists email_format varchar(20) default 'html';
