-- Apply this immediately before the exported storage_setup.sql.
-- Historical migrations and the storage export both create storage policies;
-- removing the old set first prevents duplicate-policy errors on a fresh project.

do $reset_storage_policies$
declare
  item record;
begin
  for item in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
  loop
    execute format('drop policy if exists %I on storage.objects', item.policyname);
  end loop;
end
$reset_storage_policies$;
