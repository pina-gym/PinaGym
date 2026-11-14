# PinaGym – Database Supabase

`schema.sql` membuat seluruh database PinaGym di Supabase: tabel, hak akses (Row Level Security), fungsi transaksi, dan data awal.
Folder `php/` tidak memakai Supabase dan tidak diubah.

## Langkah pasang

1. Buat project di https://supabase.com (region Singapore paling dekat).
2. **Authentication → Providers → Email**: matikan *Confirm email*. **Sign In / Providers**: matikan *Allow new users to sign up* (akun hanya dibuat admin).
3. **SQL Editor → New query**: tempel isi `schema.sql` → **Run**. Aman dijalankan ulang.
4. **Authentication → Users → Add user**: email `admin@pinagym.app`, isi password, centang *Auto Confirm*. Salin UUID user tersebut.
5. Di SQL Editor jalankan sekali:
   ```sql
   select bootstrap_admin('UUID-DARI-LANGKAH-4', 'admin', 'Nama Admin');
   ```
6. **Project Settings → API**: catat `Project URL` dan `anon public key` (aman ditaruh di aplikasi; `service_role` JANGAN).

Login di aplikasi memakai username; emailnya dibentuk otomatis `<username>@pinagym.app`.

## Struktur

| Kelompok | Tabel |
|---|---|
| Akses | `roles`, `permissions`, `role_permissions`, `profiles`, `user_permissions`, `settings` |
| Gym | `packages`, `members`, `member_contacts`, `checkins` |
| Penjualan | `products`, `product_costs`, `shifts`, `transactions`, `transaction_items`, `transaction_item_costs` |
| Lainnya | `wa_templates`, `activity_log` |

## Keamanan

- Hak akses dicek di server (`has_perm()` di setiap policy), bukan di tampilan. Menu yang disembunyikan tidak memberi perlindungan sendiri.
- Kontak member, harga modal, dan modal per item ada di tabel terpisah, hanya terbaca oleh permission `member.contact`, `product.cost`, `report.profit`.
- Transaksi tidak bisa ditulis langsung. Gunakan RPC: `pos_checkout`, `membership_sale`, `void_transaction`, `delete_transaction`. Harga dan masa aktif dihitung server.
- Member baru selalu belum aktif sampai `membership_sale` dijalankan. Check-in ditolak untuk member expired atau freeze, dan hanya sekali sehari.
- Pengguna tidak bisa mengubah role/status dirinya sendiri, dan harus selalu ada satu admin aktif.
- `bootstrap_admin` tidak bisa dipanggil dari aplikasi, hanya SQL Editor, dan hanya jika belum ada profil.

## Pembuatan user oleh admin

Membuat akun login butuh `service_role`, jadi tidak boleh dari browser. Cara yang direncanakan: Supabase Edge Function `create-user` (memeriksa `has_perm('user.manage')` lalu memanggil Auth Admin API dan menambah baris `profiles`). Sementara itu, buat user lewat dashboard (langkah 4) lalu tambahkan profilnya dari menu Manajemen User di aplikasi.

## Siap offline-first

Semua tabel memakai UUID buatan perangkat, `updated_at` otomatis, dan `deleted_at` (soft delete). Sinkron: kirim antrean lewat RPC (idempoten terhadap ID), tarik perubahan dengan `updated_at > terakhir_sinkron`.
Catatan: stok boleh negatif bila dua kasir offline menjual barang terakhir bersamaan.

## Pengujian

Skema ini diuji di PostgreSQL 16 dengan objek `auth` Supabase ditiru: 40+ pemeriksaan per role (kasir, receptionist, admin, anon), termasuk uji ditolak, idempotensi, batal/stok, dan jalankan ulang skema.
