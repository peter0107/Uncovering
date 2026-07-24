drop policy if exists "Users can upload own simulation card assets" on storage.objects;
drop policy if exists "Users can update own simulation card assets" on storage.objects;
drop policy if exists "Users can delete own simulation card assets" on storage.objects;

create policy "Users can upload own simulation card assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'simulation-card-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own simulation card assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'simulation-card-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'simulation-card-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own simulation card assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'simulation-card-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);