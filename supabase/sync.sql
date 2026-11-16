-- PinaGym: sinkron antar perangkat (laptop, HP, tablet). Jalankan sekali di Supabase > SQL Editor,
-- setelah backup.sql dan setelah akun backup dibuat (Authentication > Users, Auto Confirm User).
create sequence if not exists public.sync_seq;
create table if not exists public.sync_records (
  owner uuid not null default auth.uid(),
  coll text not null,
  id text not null,
  t bigint not null,
  del boolean not null default false,
  data jsonb,
  seq bigint not null default nextval('public.sync_seq'),
  primary key (owner, coll, id)
);
create index if not exists sync_records_owner_seq on public.sync_records (owner, seq);
create or replace function public.sync_records_bi() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.t < old.t then return null; end if; -- data lama tidak menimpa yang baru
  new.seq := nextval('public.sync_seq');
  return new;
end $$;
drop trigger if exists sync_records_bi on public.sync_records;
create trigger sync_records_bi before insert or update on public.sync_records for each row execute function public.sync_records_bi();
alter table public.sync_records enable row level security;
drop policy if exists sync_records_own on public.sync_records;
create policy sync_records_own on public.sync_records for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
revoke all on public.sync_records from anon;
grant select, insert, update, delete on public.sync_records to authenticated;
grant usage, select on sequence public.sync_seq to authenticated;
