# PinaGym

Aplikasi manajemen gym dengan dashboard dan menu yang berbeda untuk tiap role (Admin, Kasir, Receptionist). Berjalan sebagai **PWA**: bisa dipasang di HP atau komputer dan tetap bisa dipakai tanpa internet. Data tersimpan di perangkat lebih dulu, dan bisa disinkronkan otomatis ke Supabase.

## Fitur
- Dashboard dan menu otomatis menyesuaikan role. Menu yang tidak diizinkan tidak tampil, dan halaman terlarang menampilkan 403.
- Hak akses (permission) per role dapat diatur Admin.
- Member: pendaftaran, ubah data, perpanjangan, freeze, hapus, check-in, riwayat kunjungan.
- **Kartu member** dengan QR: cetak (ukuran kartu ATM), unduh PDF, kirim PDF lewat WhatsApp.
- Paket membership dan produk: tambah, ubah harga, hapus. Manajemen user: tambah, ubah, reset password, nonaktifkan, hapus.
- POS Kasir, produk dan stok, riwayat transaksi, shift, cetak ulang struk.
- WhatsApp: template pesan dan **antrean otomatis**: sambutan member baru, pengingat sebelum membership habis (default H-7, H-3, H-1, H-0, bisa diatur), dan pesan setelah habis. Tiap pesan hanya muncul sekali. Pesan dikirim dengan satu ketukan lewat WhatsApp di perangkat Anda.
- **Koneksi Database**: atur Supabase, login akun Supabase, sinkron offline-first (lihat `supabase/README.md`).
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
- `index.html`, `app.css`, `app.js`, `ui.js`: aplikasi; `sync.js`: koneksi dan sinkron Supabase; `card.js`, `qr.js`: kartu member (QR dan PDF)
- `manifest.webmanifest`, `sw.js`, `icons/`: PWA dan mode offline
- `supabase/`: skema database (`schema.sql`), Edge Function `admin-users`, dan panduan pasang
- `php/`: versi PHP + SQLite untuk XAMPP (validasi izin di server). Lihat `php/README.md`.

## Catatan keamanan
Tanpa Supabase, pembatasan role dijalankan oleh aplikasi di perangkat itu sendiri, jadi orang yang menguasai perangkat dan browser-nya dapat mengubah data lokal. Setelah terhubung ke Supabase dan login dengan akun Supabase, hak akses diperiksa server (Row Level Security) untuk semua data yang disinkronkan.

## WhatsApp: batasan
Aplikasi membuka WhatsApp dengan nomor dan pesan sudah terisi, lalu Anda menekan kirim. Pengiriman tanpa disentuh sama sekali (otomatis di latar belakang) memerlukan layanan gateway WhatsApp berbayar atau WhatsApp Business API, dan belum dipasang. PDF kartu terlampir otomatis hanya pada ponsel (lembar bagikan). Di komputer, PDF diunduh lalu dilampirkan manual.

## Rencana
- Fitur Personal Trainer (dihapus sementara).
