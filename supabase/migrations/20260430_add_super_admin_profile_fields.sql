alter table public.super_admins
  add column if not exists designation text,
  add column if not exists profile_picture_url text;

update public.super_admins
set designation = case
  when lower(email) = 'summit@bncglobal.in' then 'Founder'
  when lower(email) = 'gurvinder@bncglobal.in' then 'Co-Founder'
  else coalesce(designation, 'Executive')
end
where designation is null;

update public.super_admins as sa
set profile_picture_url = coalesce(sa.profile_picture_url, au.raw_user_meta_data ->> 'avatar_url')
from auth.users as au
where sa.auth_user_id = au.id
  and sa.profile_picture_url is null;
