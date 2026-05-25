update storage.buckets
set allowed_mime_types = null
where id in ('auditing-pdpl-documents', 'auditing-cst-documents');
