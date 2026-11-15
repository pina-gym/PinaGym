-- PinaGym: tabel cadangan (backup). Jalankan sekali di Supabase > SQL Editor.
-- Lalu buat 1 user di Authentication > Users (centang Auto Confirm User) sebagai "akun backup".
create table if not exists public.app_backups (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  device text,
  kind text not null default 'auto',
  counts jsonb not null default '{}'::jsonb,
  data jsonb not null
);
create index if not exists app_backups_owner_time on public.app_backups (owner, created_at desc);
alter table public.app_backups enable row level security;
drop policy if exists app_backups_own on public.app_backups;
create policy app_backups_own on public.app_backups for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
revoke all on public.app_backups from anon;
grant select, insert, delete on public.app_backups to authenticated;
