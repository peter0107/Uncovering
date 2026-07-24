drop policy if exists "Users can read own simulation card assets" on storage.objects;

create policy "Users can read own simulation card assets"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'simulation-card-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);