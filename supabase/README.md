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
| Lainnya | `wa_templates`, `wa_log` (pesan WA yang sudah dikirim), `activity_log` |

## Keamanan

- Hak akses dicek di server (`has_perm()` di setiap policy), bukan di tampilan. Menu yang disembunyikan tidak memberi perlindungan sendiri.
- Kontak member, harga modal, dan modal per item ada di tabel terpisah, hanya terbaca oleh permission `member.contact`, `product.cost`, `report.profit`.
- Transaksi tidak bisa ditulis langsung. Gunakan RPC: `pos_checkout`, `membership_sale`, `void_transaction`, `delete_transaction`. Harga dan masa aktif dihitung server.
- Member baru selalu belum aktif sampai `membership_sale` dijalankan. Check-in ditolak untuk member expired atau freeze, dan hanya sekali sehari.
- Pengguna tidak bisa mengubah role/status dirinya sendiri, dan harus selalu ada satu admin aktif.
- `bootstrap_admin` tidak bisa dipanggil dari aplikasi, hanya SQL Editor, dan hanya jika belum ada profil.

## Edge Function `admin-users` (kelola user dari aplikasi)

Membuat akun login, reset password, dan menghapus user butuh kunci `service_role`, jadi dijalankan di server, bukan di browser.

1. Supabase Dashboard → **Edge Functions** → **Deploy a new function** → nama `admin-users`.
2. Tempel isi `supabase/functions/admin-users/index.ts`, lalu Deploy. Biarkan *Verify JWT* aktif.
3. Setelah itu menu **Manajemen User** di aplikasi (saat login akun Supabase) bisa tambah user, reset password, dan hapus.

Fungsi ini memeriksa `has_perm('user.manage')` si pemanggil. User yang sudah punya riwayat transaksi tidak dihapus, tetapi dinonaktifkan agar riwayatnya utuh. Admin aktif terakhir tidak bisa dihapus. Tanpa fungsi ini, buat user lewat Authentication → Users lalu tambahkan profilnya dengan SQL.

## Menghubungkan aplikasi

Di aplikasi (login admin): menu **Koneksi Database** → isi Project URL dan anon key → **Simpan & Uji Koneksi**. Lalu keluar dan masuk memakai akun Supabase (username admin yang dibuat saat bootstrap). Pada login pertama pilih: ambil data dari Supabase, atau unggah data lokal.

## Cara sinkron

- Semua perubahan ditulis ke perangkat lebih dulu, jadi aplikasi tetap jalan tanpa internet.
- Saat online, aplikasi mengirim perubahan lalu menarik perubahan server (otomatis tiap beberapa detik setelah ada perubahan, saat kembali online, dan tiap 60 detik).
- Transaksi dikirim lewat fungsi RPC. Harga, stok, dan tanggal berakhir membership dihitung server. Jika penjualan terjadi saat offline lalu terkirim beberapa hari kemudian, masa aktif dihitung dari hari terkirim.
- Bentrok edit yang sama: data terakhir yang masuk menang. Stok dikurangi server per transaksi, jadi dua kasir offline tidak saling menimpa stok (stok bisa minus jika barang terakhir terjual di dua perangkat).
- Kode member bentrok antar perangkat (jarang): perangkat yang terlambat mengirim otomatis dapat kode berikutnya.
- Shift kasir dan activity log masih lokal per perangkat.

## Siap offline-first

Semua tabel memakai UUID buatan perangkat, `updated_at` otomatis, dan `deleted_at` (soft delete). Sinkron: kirim antrean lewat RPC (idempoten terhadap ID), tarik perubahan dengan `updated_at > terakhir_sinkron`.
Catatan: stok boleh negatif bila dua kasir offline menjual barang terakhir bersamaan.

## Pengujian

Skema ini diuji di PostgreSQL 16 dengan objek `auth` Supabase ditiru: 40+ pemeriksaan per role (kasir, receptionist, admin, anon), termasuk uji ditolak, idempotensi, batal/stok, dan jalankan ulang skema.
