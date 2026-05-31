update storage.buckets
set
  file_size_limit = 20971520,
  allowed_mime_types = null
where id in ('auditing-pdpl-documents', 'auditing-cst-documents');
