# PinaGym

Aplikasi manajemen gym dengan dashboard dan menu yang berbeda untuk tiap role (Admin, Kasir, Receptionist). Berjalan sebagai **PWA**: bisa dipasang di HP atau komputer dan tetap bisa dipakai tanpa internet. Data tersimpan di perangkat.

## Fitur
- Dashboard dan menu otomatis menyesuaikan role. Menu yang tidak diizinkan tidak tampil, dan halaman terlarang menampilkan 403.
- Hak akses (permission) per role dapat diatur Admin.
- Member: pendaftaran, perpanjangan, freeze, check-in, riwayat kunjungan.
- POS Kasir, produk dan stok, riwayat transaksi, shift, cetak ulang struk.
- WhatsApp: template pesan (pengingat, selamat datang member baru, membership habis).
- Laporan, dashboard TV, activity log, pengaturan, backup dan pulihkan data (JSON).
- Login dengan password ter-hash (PBKDF2), session timeout yang dapat diatur, batas percobaan login.

## Pakai
Buka alamat GitHub Pages repo ini, lalu pasang lewat menu "Pasang aplikasi" / "Add to Home screen".

Akun awal (segera ganti password di menu Manajemen User):

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Kasir | `kasir` | `kasir123` |
| Receptionist | `resepsionis` | `resepsionis123` |

Saat pertama dibuka, aplikasi berisi data contoh. Hapus lewat **Pengaturan Sistem → Kosongkan data**.

## Jalankan lokal
```
python3 -m http.server 8080
# buka http://localhost:8080
```
Service worker dan hash password butuh `https://` atau `localhost`.

## Struktur
- `index.html`, `app.css`, `app.js`: aplikasi
- `manifest.webmanifest`, `sw.js`, `icons/`: PWA dan mode offline
- `php/`: versi PHP + SQLite untuk XAMPP (validasi izin di server). Lihat `php/README.md`.

## Catatan keamanan
Pada versi PWA, pembatasan role dijalankan oleh aplikasi di perangkat itu sendiri. Orang yang menguasai perangkat dan browser-nya dapat mengubah data lokal. Untuk penjagaan di sisi server gunakan versi `php/`, atau tunggu tahap sinkronisasi database online dengan aturan akses.

## Rencana
- Simpan lokal dulu, sinkron otomatis ke database online (Supabase) saat terhubung internet.
- Fitur Personal Trainer (dihapus sementara).
