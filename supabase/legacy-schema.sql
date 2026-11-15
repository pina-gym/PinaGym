-- =====================================================================
-- PinaGym: skema database Supabase (PostgreSQL)
-- Cara pakai: Supabase Dashboard -> SQL Editor -> tempel seluruh isi file ini -> Run.
-- File ini aman dijalankan ulang (memakai "if not exists" / "create or replace").
--
-- Prinsip:
--  * Semua hak akses divalidasi di server lewat Row Level Security (RLS).
--  * Data sensitif dipisah ke tabel sendiri (member_contacts, product_costs,
--    transaction_item_costs) agar bisa disembunyikan per permission.
--  * Transaksi uang (POS, penjualan membership, batal, hapus) hanya lewat fungsi RPC.
--    Harga selalu diambil dari database, bukan dari perangkat.
--  * Semua tabel memakai UUID yang dibuat di perangkat, updated_at otomatis, dan
--    deleted_at (soft delete), supaya siap untuk sinkron offline-first.
-- =====================================================================

-- ---------- 0. Utilitas ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- ---------- 1. Role, permission, profil ----------
create table if not exists public.roles (
  id    text primary key,
  label text not null
);

create table if not exists public.permissions (
  key   text primary key,
  label text not null,
  grp   text not null
);

create table if not exists public.role_permissions (
  role text not null references public.roles(id) on delete cascade,
  perm text not null references public.permissions(key) on delete cascade,
  primary key (role, perm)
);

-- Satu baris per pengguna (id sama dengan auth.users.id).
-- Login di aplikasi memakai username; email Supabase Auth dibentuk <username>@pinagym.app.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique check (username ~ '^[a-z0-9_.-]{3,30}$'),
  name       text not null,
  role       text not null references public.roles(id),
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pengecualian hak akses per pengguna (allow = true izinkan, false tolak).
create table if not exists public.user_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  perm    text not null references public.permissions(key) on delete cascade,
  allow   boolean not null,
  primary key (user_id, perm)
);

create table if not exists public.settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- ---------- 2. Data gym ----------
create table if not exists public.packages (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  duration_days int  not null check (duration_days > 0),
  price         bigint not null check (price >= 0),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create sequence if not exists public.member_code_seq;

create table if not exists public.members (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,            -- diisi otomatis GYM0001 dst jika kosong
  name       text not null,
  package_id uuid references public.packages(id),
  start_date date not null default (now() at time zone 'Asia/Jakarta')::date,
  end_date   date not null default (now() at time zone 'Asia/Jakarta')::date,
  status     text not null default 'active' check (status in ('active', 'freeze')),
  joined_at  date not null default (now() at time zone 'Asia/Jakarta')::date,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists members_end_date_idx on public.members (end_date);
create index if not exists members_updated_idx  on public.members (updated_at);

-- Kontak dipisah: hanya pemegang permission member.contact yang bisa membaca.
create table if not exists public.member_contacts (
  member_id  uuid primary key references public.members(id) on delete cascade,
  phone      text,
  address    text,
  updated_at timestamptz not null default now()
);

create table if not exists public.checkins (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.members(id),
  checked_in_at timestamptz not null default now(),
  checkin_date  date not null,                 -- diisi trigger (zona waktu Asia/Jakarta)
  created_by    uuid references public.profiles(id) default auth.uid(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists one_checkin_per_day on public.checkins (member_id, checkin_date);
create index if not exists checkins_date_idx on public.checkins (checkin_date);

create table if not exists public.products (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  price      bigint not null check (price >= 0),
  stock      int not null default 0,           -- boleh negatif bila penjualan offline melebihi stok
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Harga modal dipisah: hanya pemegang product.cost yang bisa membaca.
create table if not exists public.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  cost       bigint not null default 0 check (cost >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.shifts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) default auth.uid(),
  opened_at    timestamptz not null default now(),
  closed_at    timestamptz,
  opening_cash bigint not null default 0 check (opening_cash >= 0),
  closing_cash bigint check (closing_cash >= 0),
  updated_at   timestamptz not null default now()
);
create unique index if not exists one_open_shift_per_user on public.shifts (user_id) where closed_at is null;

-- Transaksi hanya dibuat lewat fungsi pos_checkout() dan membership_sale().
create table if not exists public.transactions (
  id         uuid primary key default gen_random_uuid(),
  invoice    text not null unique,
  type       text not null check (type in ('membership', 'pos')),
  user_id    uuid not null references public.profiles(id),
  member_id  uuid references public.members(id),
  package_id uuid references public.packages(id),
  total      bigint not null check (total >= 0),
  method     text not null check (method in ('cash', 'noncash')),
  shift_id   uuid references public.shifts(id),
  voided     boolean not null default false,
  voided_at  timestamptz,
  voided_by  uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists tx_created_idx on public.transactions (created_at);
create index if not exists tx_user_idx    on public.transactions (user_id);

create table if not exists public.transaction_items (
  id             uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  product_id     uuid references public.products(id),
  name           text not null,
  qty            int not null check (qty > 0),
  price          bigint not null check (price >= 0),
  updated_at     timestamptz not null default now()
);
create index if not exists items_tx_idx on public.transaction_items (transaction_id);

-- Modal per item (untuk laporan keuntungan): hanya report.profit.
create table if not exists public.transaction_item_costs (
  item_id uuid primary key references public.transaction_items(id) on delete cascade,
  cost    bigint not null default 0 check (cost >= 0)
);

create table if not exists public.wa_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  body       text not null,
  updated_at timestamptz not null default now()
);

-- Catatan pesan WhatsApp yang sudah dikirim (sambutan dan pengingat), agar tidak dikirim dua kali
-- walaupun dari perangkat berbeda. Kolom k berisi kunci unik, contoh: w|<member> atau <member>|<tgl akhir>|h3.
create table if not exists public.wa_log (
  id         uuid primary key default gen_random_uuid(),
  k          text not null unique,
  member_id  uuid references public.members(id) on delete set null,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id         bigint generated always as identity primary key,
  user_id    uuid default auth.uid(),
  action     text not null,
  detail     text,
  created_at timestamptz not null default now()
);
create index if not exists activity_created_idx on public.activity_log (created_at desc);

-- ---------- 3. Fungsi hak akses ----------
create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active)
$$;

-- Permission efektif = permission role, lalu dikoreksi pengecualian per pengguna.
-- Admin selalu memegang user.manage dan permission.manage (anti terkunci).
create or replace function public.has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when pr.role = 'admin' and p in ('user.manage', 'permission.manage') then true
      else coalesce(
        (select up.allow from user_permissions up where up.user_id = pr.id and up.perm = p),
        exists (select 1 from role_permissions rp where rp.role = pr.role and rp.perm = p)
      )
    end
    from profiles pr where pr.id = auth.uid() and pr.active
  ), false)
$$;

-- Daftar permission efektif pengguna yang sedang login (untuk menu di aplikasi).
create or replace function public.my_permissions() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(k.key order by k.key), '{}') from permissions k where has_perm(k.key)
$$;

-- ---------- 4. Trigger ----------
do $$
declare t text;
begin
  foreach t in array array['profiles','settings','packages','members','member_contacts','checkins',
    'products','product_costs','shifts','transactions','transaction_items','wa_templates','wa_log'] loop
    execute format('drop trigger if exists trg_touch on public.%I', t);
    execute format('create trigger trg_touch before insert or update on public.%I
                    for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- Kode member otomatis.
create or replace function public.members_assign_code() returns trigger
language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    new.code := 'GYM' || lpad(nextval('public.member_code_seq')::text, 4, '0');
  end if;
  return new;
end $$;
drop trigger if exists trg_10_code on public.members;
create trigger trg_10_code before insert on public.members
  for each row execute function public.members_assign_code();

-- Penjaga kolom member: RLS bekerja per baris, trigger ini membatasi per kolom.
create or replace function public.members_guard() returns trigger
language plpgsql as $$
declare today date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if coalesce(current_setting('app.bypass_guard', true), '') = '1' or auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    -- member baru belum membayar: masa aktif baru dimulai lewat membership_sale()
    new.package_id := null; new.start_date := today; new.end_date := today - 1;
    new.status := 'active'; new.deleted_at := null; new.created_by := auth.uid();
    return new;
  end if;
  if new.code is distinct from old.code then
    raise exception 'Kode member tidak boleh diubah' using errcode = '42501';
  end if;
  if new.name is distinct from old.name and not has_perm('member.edit') then
    raise exception 'Tidak berhak mengubah data member' using errcode = '42501';
  end if;
  if new.status is distinct from old.status and not has_perm('membership.freeze') then
    raise exception 'Tidak berhak mengubah status freeze' using errcode = '42501';
  end if;
  if (new.package_id, new.start_date, new.end_date) is distinct from (old.package_id, old.start_date, old.end_date)
     and not has_perm('member.extend') then
    raise exception 'Tidak berhak mengubah masa membership' using errcode = '42501';
  end if;
  if new.deleted_at is distinct from old.deleted_at and not has_perm('member.delete') then
    raise exception 'Tidak berhak menghapus member' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_20_guard on public.members;
create trigger trg_20_guard before insert or update on public.members
  for each row execute function public.members_guard();

-- Validasi check-in: member harus aktif dan tidak sedang freeze.
create or replace function public.checkins_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare m members%rowtype; d date;
begin
  d := (new.checked_in_at at time zone 'Asia/Jakarta')::date;
  new.checkin_date := d;
  if tg_op = 'INSERT' and auth.uid() is not null then
    new.created_by := auth.uid();
    select * into m from members where id = new.member_id;
    if not found or m.deleted_at is not null then raise exception 'Member tidak ditemukan'; end if;
    if m.status = 'freeze' then raise exception 'Membership % sedang di-freeze', m.code; end if;
    if m.end_date < d then raise exception 'Membership % expired sejak %', m.code, m.end_date; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_10_checkin on public.checkins;
create trigger trg_10_checkin before insert or update on public.checkins
  for each row execute function public.checkins_guard();

-- Pengguna tidak boleh mengubah role/status dirinya sendiri, dan harus selalu ada admin aktif.
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'UPDATE' and old.id = auth.uid()
     and (new.role is distinct from old.role or new.active is distinct from old.active) then
    raise exception 'Tidak boleh mengubah role atau status akun sendiri' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.role = 'admin' and old.active
     and (new.role <> 'admin' or not new.active)
     and not exists (select 1 from profiles where role = 'admin' and active and id <> old.id) then
    raise exception 'Harus ada minimal satu admin aktif';
  end if;
  return new;
end $$;
drop trigger if exists trg_20_guard on public.profiles;
create trigger trg_20_guard before update on public.profiles
  for each row execute function public.profiles_guard();

-- ---------- 5. Fungsi transaksi (RPC) ----------
-- Semua fungsi idempoten terhadap p_id: dipanggil ulang saat sinkron tidak membuat data ganda.

-- p_items: [{"product_id":"<uuid>","qty":2}, ...]
drop function if exists public.pos_checkout(uuid, text, jsonb, text, timestamptz);
create or replace function public.pos_checkout(p_id uuid, p_invoice text, p_items jsonb, p_method text,
                                               p_at timestamptz default now(), p_member uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid(); v_total bigint := 0; v_shift uuid; v_item uuid; v_prod products%rowtype;
  e jsonb; v_pid uuid; v_qty int;
begin
  if v_user is null or not has_perm('pos.checkout') then
    raise exception 'Tidak berhak melakukan checkout' using errcode = '42501';
  end if;
  if p_method not in ('cash', 'noncash') then raise exception 'Metode pembayaran tidak valid'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang kosong';
  end if;
  if exists (select 1 from transactions where id = p_id) then
    if exists (select 1 from transactions where id = p_id and user_id = v_user) then return p_id; end if;
    raise exception 'ID transaksi sudah dipakai' using errcode = '42501';
  end if;

  select id into v_shift from shifts where user_id = v_user and closed_at is null limit 1;
  if p_member is not null and not exists (select 1 from members where id = p_member and deleted_at is null) then
    raise exception 'Member tidak ditemukan';
  end if;
  insert into transactions (id, invoice, type, user_id, member_id, total, method, shift_id, created_at)
  values (p_id, p_invoice, 'pos', v_user, p_member, 0, p_method, v_shift, least(coalesce(p_at, now()), now()));

  for e in select * from jsonb_array_elements(p_items) loop
    v_pid := (e ->> 'product_id')::uuid;
    v_qty := (e ->> 'qty')::int;
    if v_qty is null or v_qty < 1 then raise exception 'Jumlah barang tidak valid'; end if;
    select * into v_prod from products where id = v_pid and active and deleted_at is null;
    if not found then raise exception 'Produk tidak ditemukan atau nonaktif'; end if;
    insert into transaction_items (transaction_id, product_id, name, qty, price)
      values (p_id, v_prod.id, v_prod.name, v_qty, v_prod.price) returning id into v_item;
    insert into transaction_item_costs (item_id, cost)
      values (v_item, coalesce((select cost from product_costs where product_id = v_prod.id), 0));
    update products set stock = stock - v_qty where id = v_prod.id;
    v_total := v_total + v_prod.price * v_qty;
  end loop;

  update transactions set total = v_total where id = p_id;
  insert into activity_log (user_id, action, detail) values (v_user, 'pos_checkout', p_invoice);
  return p_id;
end $$;

-- Penjualan / perpanjangan membership. Harga dan masa aktif dihitung di server.
create or replace function public.membership_sale(p_id uuid, p_invoice text, p_member uuid, p_package uuid,
                                                  p_method text, p_at timestamptz default now())
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid(); m members%rowtype; k packages%rowtype; v_shift uuid; v_item uuid;
  today date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if v_user is null or not (has_perm('member.create') or has_perm('member.extend')) then
    raise exception 'Tidak berhak menjual membership' using errcode = '42501';
  end if;
  if p_method not in ('cash', 'noncash') then raise exception 'Metode pembayaran tidak valid'; end if;
  if exists (select 1 from transactions where id = p_id) then
    if exists (select 1 from transactions where id = p_id and user_id = v_user) then return p_id; end if;
    raise exception 'ID transaksi sudah dipakai' using errcode = '42501';
  end if;
  select * into m from members where id = p_member and deleted_at is null;
  if not found then raise exception 'Member tidak ditemukan'; end if;
  select * into k from packages where id = p_package and active and deleted_at is null;
  if not found then raise exception 'Paket tidak ditemukan atau nonaktif'; end if;
  -- perpanjangan member yang masih aktif memerlukan member.extend
  if m.end_date >= today and not has_perm('member.extend') then
    raise exception 'Tidak berhak memperpanjang membership' using errcode = '42501';
  end if;

  perform set_config('app.bypass_guard', '1', true);
  update members set package_id = k.id,
         start_date = case when m.end_date < today then today else m.start_date end,
         end_date   = greatest(m.end_date, today) + k.duration_days
   where id = m.id;
  perform set_config('app.bypass_guard', '0', true);

  select id into v_shift from shifts where user_id = v_user and closed_at is null limit 1;
  insert into transactions (id, invoice, type, user_id, member_id, package_id, total, method, shift_id, created_at)
  values (p_id, p_invoice, 'membership', v_user, m.id, k.id, k.price, p_method, v_shift,
          least(coalesce(p_at, now()), now()));
  insert into transaction_items (transaction_id, name, qty, price)
    values (p_id, 'Membership ' || k.name || ' (' || m.code || ')', 1, k.price) returning id into v_item;
  insert into transaction_item_costs (item_id, cost) values (v_item, 0);
  insert into activity_log (user_id, action, detail) values (v_user, 'membership_sale', p_invoice || ' ' || m.code);
  return p_id;
end $$;

-- Batalkan transaksi: stok barang POS dikembalikan.
-- Catatan: pembatalan penjualan membership tidak mengubah tanggal member; koreksi tanggal dilakukan manual.
create or replace function public.void_transaction(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t transactions%rowtype; i record;
begin
  if auth.uid() is null or not has_perm('pos.cancel') then
    raise exception 'Tidak berhak membatalkan transaksi' using errcode = '42501';
  end if;
  select * into t from transactions where id = p_id for update;
  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if t.voided then return; end if;
  for i in select product_id, qty from transaction_items where transaction_id = p_id and product_id is not null loop
    update products set stock = stock + i.qty where id = i.product_id;
  end loop;
  update transactions set voided = true, voided_at = now(), voided_by = auth.uid() where id = p_id;
  insert into activity_log (user_id, action, detail) values (auth.uid(), 'transaksi_batal', t.invoice);
end $$;

-- Hapus transaksi (soft delete, hanya yang punya transaction.delete).
create or replace function public.delete_transaction(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_inv text;
begin
  if auth.uid() is null or not has_perm('transaction.delete') then
    raise exception 'Tidak berhak menghapus transaksi' using errcode = '42501';
  end if;
  update transactions set deleted_at = now() where id = p_id and deleted_at is null returning invoice into v_inv;
  if v_inv is not null then
    insert into activity_log (user_id, action, detail) values (auth.uid(), 'transaksi_hapus', v_inv);
  end if;
end $$;

-- Admin pertama. Jalankan SEKALI di SQL Editor setelah membuat user di Authentication -> Users.
create or replace function public.bootstrap_admin(p_user uuid, p_username text, p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from profiles) then raise exception 'Profil sudah ada. Bootstrap hanya untuk admin pertama.'; end if;
  insert into profiles (id, username, name, role) values (p_user, lower(p_username), p_name, 'admin');
  insert into activity_log (user_id, action, detail) values (p_user, 'bootstrap_admin', lower(p_username));
end $$;

-- ---------- 6. View ----------
-- Staf (nama saja) untuk menampilkan nama kasir pada transaksi.
create or replace view public.staff as
  select id, name, username, role, active from public.profiles where public.is_active_user();

-- Nama gym untuk halaman login (sebelum login).
create or replace view public.public_settings as
  select key, value from public.settings where key = 'gym_name';

-- ---------- 7. Row Level Security ----------
do $$
declare t text;
begin
  foreach t in array array['roles','permissions','role_permissions','profiles','user_permissions','settings',
    'packages','members','member_contacts','checkins','products','product_costs','shifts','transactions',
    'transaction_items','transaction_item_costs','wa_templates','wa_log','activity_log'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Referensi: semua pengguna aktif boleh membaca.
drop policy if exists roles_read on public.roles;
create policy roles_read on public.roles for select to authenticated using (public.is_active_user());
drop policy if exists permissions_read on public.permissions;
create policy permissions_read on public.permissions for select to authenticated using (public.is_active_user());
drop policy if exists role_perms_read on public.role_permissions;
create policy role_perms_read on public.role_permissions for select to authenticated using (public.is_active_user());
drop policy if exists role_perms_write on public.role_permissions;
create policy role_perms_write on public.role_permissions for all to authenticated
  using (public.has_perm('permission.manage') and role <> 'admin')
  with check (public.has_perm('permission.manage') and role <> 'admin');

-- Profil.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_perm('user.manage'));
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (public.has_perm('user.manage'));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (public.has_perm('user.manage')) with check (public.has_perm('user.manage'));

drop policy if exists user_perms_read on public.user_permissions;
create policy user_perms_read on public.user_permissions for select to authenticated
  using (user_id = auth.uid() or public.has_perm('permission.manage'));
drop policy if exists user_perms_write on public.user_permissions;
create policy user_perms_write on public.user_permissions for all to authenticated
  using (public.has_perm('permission.manage')) with check (public.has_perm('permission.manage'));

-- Pengaturan: kunci gym_* butuh gym.settings, selain itu settings.manage.
drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select to authenticated using (public.is_active_user());
drop policy if exists settings_write on public.settings;
create policy settings_write on public.settings for all to authenticated
  using (case when starts_with(key, 'gym_') then public.has_perm('gym.settings') else public.has_perm('settings.manage') end)
  with check (case when starts_with(key, 'gym_') then public.has_perm('gym.settings') else public.has_perm('settings.manage') end);

-- Paket.
drop policy if exists packages_read on public.packages;
create policy packages_read on public.packages for select to authenticated using (public.has_perm('package.view'));
drop policy if exists packages_write on public.packages;
create policy packages_write on public.packages for all to authenticated
  using (public.has_perm('package.manage')) with check (public.has_perm('package.manage'));

-- Member (kolom dijaga trigger members_guard).
drop policy if exists members_read on public.members;
create policy members_read on public.members for select to authenticated
  using (public.has_perm('member.view') or public.has_perm('report.view'));
drop policy if exists members_insert on public.members;
create policy members_insert on public.members for insert to authenticated
  with check (public.has_perm('member.create'));
drop policy if exists members_update on public.members;
create policy members_update on public.members for update to authenticated
  using (public.has_perm('member.edit') or public.has_perm('member.extend')
         or public.has_perm('membership.freeze') or public.has_perm('member.delete'))
  with check (true);

drop policy if exists contacts_read on public.member_contacts;
create policy contacts_read on public.member_contacts for select to authenticated using (public.has_perm('member.contact'));
drop policy if exists contacts_insert on public.member_contacts;
create policy contacts_insert on public.member_contacts for insert to authenticated with check (public.has_perm('member.create'));
drop policy if exists contacts_update on public.member_contacts;
create policy contacts_update on public.member_contacts for update to authenticated
  using (public.has_perm('member.edit')) with check (public.has_perm('member.edit'));

-- Check-in.
drop policy if exists checkins_read on public.checkins;
create policy checkins_read on public.checkins for select to authenticated
  using (public.has_perm('attendance.view') or public.has_perm('attendance.checkin') or public.has_perm('report.view'));
drop policy if exists checkins_insert on public.checkins;
create policy checkins_insert on public.checkins for insert to authenticated
  with check (public.has_perm('attendance.checkin'));

-- Produk.
drop policy if exists products_read on public.products;
create policy products_read on public.products for select to authenticated
  using (public.has_perm('product.view') or public.has_perm('pos.access'));
drop policy if exists products_write on public.products;
create policy products_write on public.products for all to authenticated
  using (public.has_perm('product.manage')) with check (public.has_perm('product.manage'));
drop policy if exists pcost_read on public.product_costs;
create policy pcost_read on public.product_costs for select to authenticated using (public.has_perm('product.cost'));
drop policy if exists pcost_write on public.product_costs;
create policy pcost_write on public.product_costs for all to authenticated
  using (public.has_perm('product.manage')) with check (public.has_perm('product.manage'));

-- Shift.
drop policy if exists shifts_read on public.shifts;
create policy shifts_read on public.shifts for select to authenticated
  using (public.has_perm('shift.manage') or (user_id = auth.uid() and public.has_perm('shift.own')));
drop policy if exists shifts_insert on public.shifts;
create policy shifts_insert on public.shifts for insert to authenticated
  with check (user_id = auth.uid() and public.has_perm('shift.own'));
drop policy if exists shifts_update on public.shifts;
create policy shifts_update on public.shifts for update to authenticated
  using ((user_id = auth.uid() and public.has_perm('shift.own')) or public.has_perm('shift.manage'))
  with check ((user_id = auth.uid() and public.has_perm('shift.own')) or public.has_perm('shift.manage'));

-- Transaksi: hanya dibaca. Penulisan lewat fungsi RPC.
drop policy if exists tx_read on public.transactions;
create policy tx_read on public.transactions for select to authenticated
  using (public.has_perm('transaction.all') or (user_id = auth.uid() and public.has_perm('transaction.view')));
drop policy if exists items_read on public.transaction_items;
create policy items_read on public.transaction_items for select to authenticated
  using (exists (select 1 from public.transactions t where t.id = transaction_id));
drop policy if exists icost_read on public.transaction_item_costs;
create policy icost_read on public.transaction_item_costs for select to authenticated using (public.has_perm('report.profit'));

-- WhatsApp.
drop policy if exists wa_read on public.wa_templates;
create policy wa_read on public.wa_templates for select to authenticated
  using (public.has_perm('whatsapp.manage') or public.has_perm('whatsapp.send'));
drop policy if exists wa_write on public.wa_templates;
create policy wa_write on public.wa_templates for all to authenticated
  using (public.has_perm('whatsapp.manage')) with check (public.has_perm('whatsapp.manage'));

drop policy if exists walog_read on public.wa_log;
create policy walog_read on public.wa_log for select to authenticated
  using (public.has_perm('whatsapp.send') or public.has_perm('whatsapp.manage'));
drop policy if exists walog_insert on public.wa_log;
create policy walog_insert on public.wa_log for insert to authenticated with check (public.has_perm('whatsapp.send'));
drop policy if exists walog_update on public.wa_log;
create policy walog_update on public.wa_log for update to authenticated
  using (public.has_perm('whatsapp.send')) with check (public.has_perm('whatsapp.send'));

-- Activity log: tambah-saja.
drop policy if exists log_read on public.activity_log;
create policy log_read on public.activity_log for select to authenticated using (public.has_perm('log.view'));
drop policy if exists log_insert on public.activity_log;
create policy log_insert on public.activity_log for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user());

-- ---------- 8. Hak istimewa (grant) ----------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.transactions, public.transaction_items, public.transaction_item_costs,
  public.activity_log, public.roles, public.permissions from authenticated;
grant insert on public.activity_log to authenticated;
revoke update, delete on public.checkins from authenticated;
revoke delete on public.members, public.packages, public.products, public.profiles, public.shifts, public.wa_log from authenticated;
revoke select, insert, update, delete on public.staff, public.public_settings from authenticated;
grant select on public.staff to authenticated;
grant select on public.public_settings to anon, authenticated;
grant usage on all sequences in schema public to authenticated;

grant execute on function public.is_active_user(), public.has_perm(text), public.my_permissions(),
  public.pos_checkout(uuid, text, jsonb, text, timestamptz, uuid),
  public.membership_sale(uuid, text, uuid, uuid, text, timestamptz),
  public.void_transaction(uuid), public.delete_transaction(uuid) to authenticated;
-- bootstrap_admin() sengaja tidak diberi ke authenticated: jalankan dari SQL Editor.

-- ---------- 9. Data awal ----------
insert into public.roles (id, label) values
  ('admin', 'Admin'), ('kasir', 'Kasir'), ('receptionist', 'Receptionist')
on conflict (id) do update set label = excluded.label;

insert into public.permissions (key, label, grp) values
  ('member.view', 'Lihat data member', 'Member'),
  ('member.contact', 'Lihat kontak member (HP/alamat)', 'Member'),
  ('member.create', 'Daftarkan member', 'Member'),
  ('member.edit', 'Ubah data member', 'Member'),
  ('member.delete', 'Hapus member', 'Member'),
  ('member.extend', 'Perpanjang membership', 'Member'),
  ('membership.freeze', 'Freeze membership', 'Member'),
  ('package.view', 'Lihat paket membership', 'Member'),
  ('package.manage', 'Kelola paket membership', 'Member'),
  ('attendance.checkin', 'QR check-in', 'Kehadiran'),
  ('attendance.view', 'Riwayat kunjungan', 'Kehadiran'),
  ('pos.access', 'Akses POS', 'Penjualan'),
  ('pos.checkout', 'Checkout POS', 'Penjualan'),
  ('pos.cancel', 'Batalkan transaksi', 'Penjualan'),
  ('pos.reprint', 'Cetak ulang struk', 'Penjualan'),
  ('product.view', 'Lihat produk dan stok', 'Penjualan'),
  ('product.manage', 'Kelola produk dan harga', 'Penjualan'),
  ('product.cost', 'Lihat harga modal', 'Penjualan'),
  ('transaction.view', 'Riwayat transaksi sendiri', 'Penjualan'),
  ('transaction.all', 'Lihat transaksi semua kasir', 'Penjualan'),
  ('transaction.delete', 'Hapus transaksi', 'Penjualan'),
  ('shift.own', 'Buka/tutup shift sendiri', 'Penjualan'),
  ('shift.manage', 'Kelola semua shift', 'Penjualan'),
  ('report.view', 'Lihat laporan', 'Laporan'),
  ('report.profit', 'Lihat laporan keuntungan dan modal', 'Laporan'),
  ('tv.view', 'Dashboard TV', 'Sistem'),
  ('whatsapp.manage', 'Kelola template WhatsApp', 'Sistem'),
  ('whatsapp.send', 'Kirim WhatsApp (template)', 'Sistem'),
  ('user.manage', 'Manajemen user', 'Sistem'),
  ('permission.manage', 'Kelola hak akses', 'Sistem'),
  ('gym.settings', 'Pengaturan gym', 'Sistem'),
  ('settings.manage', 'Pengaturan sistem', 'Sistem'),
  ('backup.manage', 'Backup data', 'Sistem'),
  ('log.view', 'Lihat activity log', 'Sistem')
on conflict (key) do update set label = excluded.label, grp = excluded.grp;

insert into public.role_permissions (role, perm)
  select 'admin', key from public.permissions
on conflict do nothing;
insert into public.role_permissions (role, perm) values
  ('kasir', 'pos.access'), ('kasir', 'pos.checkout'), ('kasir', 'pos.reprint'), ('kasir', 'member.view'),
  ('kasir', 'member.create'), ('kasir', 'member.extend'), ('kasir', 'package.view'), ('kasir', 'product.view'),
  ('kasir', 'transaction.view'), ('kasir', 'shift.own'),
  ('receptionist', 'member.view'), ('receptionist', 'member.contact'), ('receptionist', 'member.create'),
  ('receptionist', 'member.edit'), ('receptionist', 'member.extend'), ('receptionist', 'membership.freeze'),
  ('receptionist', 'package.view'), ('receptionist', 'attendance.checkin'), ('receptionist', 'attendance.view'),
  ('receptionist', 'whatsapp.send')
on conflict do nothing;

insert into public.settings (key, value) values
  ('gym_name', 'PinaGym'), ('gym_address', ''), ('gym_phone', ''),
  ('session_timeout', '30'), ('expiring_days', '7')
on conflict (key) do nothing;

insert into public.packages (name, duration_days, price)
  select * from (values ('Harian', 1, 25000), ('Bulanan', 30, 250000), ('3 Bulan', 90, 650000), ('Tahunan', 365, 2200000))
    as v(name, duration_days, price)
  where not exists (select 1 from public.packages);

insert into public.wa_templates (name, body)
  select * from (values
    ('Pengingat Expired', 'Halo {nama}, membership Anda di {gym} akan berakhir pada {tanggal}. Yuk perpanjang agar latihan tetap lancar!'),
    ('Selamat Datang', 'Selamat bergabung di {gym}, {nama}! Kode member Anda: {kode}.'),
    ('Membership Habis', 'Halo {nama}, membership Anda sudah berakhir pada {tanggal}. Hubungi kami untuk perpanjangan.'))
    as v(name, body)
  where not exists (select 1 from public.wa_templates);

-- ---------- 10. Realtime (opsional, hanya jika publikasi tersedia) ----------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['members','member_contacts','checkins','packages','products','product_costs',
      'shifts','transactions','transaction_items','transaction_item_costs','settings','wa_templates','wa_log'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
