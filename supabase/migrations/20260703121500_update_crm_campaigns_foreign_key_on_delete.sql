-- Alter foreign key constraint for template_id in crm_campaigns table
-- to set NULL when the referenced template is deleted.
ALTER TABLE public.crm_campaigns 
DROP CONSTRAINT IF EXISTS crm_campaigns_template_id_fkey;

ALTER TABLE public.crm_campaigns
ADD CONSTRAINT crm_campaigns_template_id_fkey
FOREIGN KEY (template_id) REFERENCES public.crm_email_templates(id)
ON DELETE SET NULL;
