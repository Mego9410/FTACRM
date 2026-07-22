-- Storage bucket the app uploads to (practice headline photos + record
-- documents). Server actions write/read via the service-role client, which
-- bypasses RLS, but the bucket itself must exist — without it uploads fail
-- with "Bucket not found". Private: files are served through signed URLs.
--
-- Guarded so it's a no-op on a plain Postgres (e.g. local migration checks)
-- that has no Supabase `storage` schema, and idempotent on re-run.

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'storage' and table_name = 'buckets'
  ) then
    insert into storage.buckets (id, name, public)
    values ('documents', 'documents', false)
    on conflict (id) do nothing;

    -- Authenticated staff may read/write objects in this bucket directly
    -- (service-role access already bypasses RLS; these cover any client-side
    -- calls). Each guarded so re-running the migration is safe.
    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'documents_authenticated_read'
    ) then
      create policy documents_authenticated_read on storage.objects
        for select to authenticated using (bucket_id = 'documents');
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'documents_authenticated_insert'
    ) then
      create policy documents_authenticated_insert on storage.objects
        for insert to authenticated with check (bucket_id = 'documents');
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'documents_authenticated_update'
    ) then
      create policy documents_authenticated_update on storage.objects
        for update to authenticated using (bucket_id = 'documents') with check (bucket_id = 'documents');
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'documents_authenticated_delete'
    ) then
      create policy documents_authenticated_delete on storage.objects
        for delete to authenticated using (bucket_id = 'documents');
    end if;
  end if;
end $$;
