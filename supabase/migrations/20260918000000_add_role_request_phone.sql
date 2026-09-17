alter table public.company_role_requests
  add column if not exists requester_phone text;
