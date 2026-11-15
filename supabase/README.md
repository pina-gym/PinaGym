# Supabase: backup PinaGym

Supabase dipakai sebagai **tempat backup**. Data kerja tetap di perangkat, dan user aplikasi dikelola lokal.

1. Buat project di supabase.com.
2. SQL Editor: jalankan isi `backup.sql` (aman diulang).
3. Authentication → Users → Add user: buat satu user (email + password), centang **Auto Confirm User**. Ini akun backup, bukan akun login aplikasi.
4. Di aplikasi (login admin): menu **Backup Database** → isi Project URL, anon/publishable key, email dan password akun backup → Simpan & Hubungkan.
5. Backup berjalan otomatis sekali sehari saat aplikasi dibuka dan ada internet. Tombol **Backup sekarang** untuk manual. 30 backup terakhir disimpan.

Pulihkan di perangkat baru: pasang aplikasi, login admin, hubungkan akun backup, pilih backup, Pulihkan.

Keamanan: tabel `app_backups` dilindungi RLS, hanya akun pemilik yang bisa membaca. Backup berisi seluruh data termasuk hash password user. Jangan pakai kunci `service_role` di aplikasi.

`legacy-schema.sql` adalah skema sinkron relasional versi sebelumnya, tidak dipakai lagi.
