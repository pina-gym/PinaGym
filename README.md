# PinaGym

Aplikasi manajemen gym dengan dashboard dan menu yang berbeda untuk tiap role (Admin, Kasir, Receptionist). Berjalan sebagai **PWA**: bisa dipasang di HP atau komputer dan tetap bisa dipakai tanpa internet. Data tersimpan di perangkat lebih dulu, dan dicadangkan otomatis setiap hari ke Supabase.

## Fitur
- Dashboard dan menu otomatis menyesuaikan role. Menu yang tidak diizinkan tidak tampil, dan halaman terlarang menampilkan 403.
- Hak akses (permission) per role dapat diatur Admin.
- Member: pendaftaran, ubah data, perpanjangan, freeze, hapus, check-in, riwayat kunjungan.
- **Kartu member** dengan QR: cetak (ukuran kartu ATM), unduh PDF, kirim PDF lewat WhatsApp.
- Paket membership dan produk: tambah, ubah harga, hapus. Manajemen user: tambah, ubah, reset password, nonaktifkan, hapus.
- POS Kasir, produk dan stok, riwayat transaksi, shift, cetak ulang struk.
- WhatsApp: template pesan dan **antrean otomatis**: sambutan member baru, pengingat sebelum membership habis (default H-7, H-3, H-1, H-0, bisa diatur), dan pesan setelah habis. Tiap pesan hanya muncul sekali. Pesan dikirim dengan satu ketukan lewat WhatsApp di perangkat Anda.
- **Backup Database**: koneksi Supabase ada di menu ini. Backup otomatis harian seluruh isi aplikasi, daftar backup, pulihkan, hapus, plus backup/pulihkan lewat file (lihat `supabase/README.md`).
- Tabel otomatis menjadi kartu di HP/tablet; edit dan hapus lewat pop-up konfirmasi; pilih banyak lalu hapus.
- **QR check-in di latar belakang** (kasir/admin, semua menu): scanner USB/Bluetooth (mode keyboard), scanner serial, atau kamera. Pop-up: masuk, freeze, tidak aktif, hampir habis, plus tombol tambah produk ke POS.
- **Cetak struk** ke printer Bluetooth/USB/Serial (ESC/POS) atau browser, kertas 57/58/80 mm, default di Pengaturan.
- **Trainer**: pendaftaran, sesi (diatur admin), gaji trainer (pokok + persen) dan kasir (pokok), slip cetak/PDF/WhatsApp.
- **Export Excel** riwayat transaksi harian/mingguan/bulanan/rentang bebas.
- **Promo & voucher** (persen/rupiah, minimal belanja, masa berlaku, kuota) dan diskon manual di POS; **stok opname** dengan stok minimum dan riwayat; **bonus/potongan** di slip gaji; **WhatsApp massal** tanpa gateway (Daftar Siaran via kontak .vcf, atau kirim berurutan); banner "versi baru tersedia".
- Laporan, dashboard TV, activity log, pengaturan, backup dan pulihkan data (JSON).
- Login dengan password ter-hash (PBKDF2), session timeout yang dapat diatur, batas percobaan login.
- **POS sekali ketuk**: produk dan paket membership tampil sebagai tile; ketuk untuk menambah, keranjang ringkas dengan tombol +/−, tombol **Bayar** mengambang (di HP muncul di atas menu bawah).
- **Paket member + trainer**: paket bisa ditandai "termasuk trainer". Saat daftar/perpanjang (menu atau POS) kasir/admin memilih trainer dari daftar; member otomatis masuk ke trainer itu dan tiap check-in tercatat sebagai satu sesi (dasar komisi persentase).
- **Logo gym**: unggah di Pengaturan Gym. Tampil di struk (layar, browser, thermal), kartu member (SVG/PDF), slip & rekap gaji (PDF/cetak), menu samping, login, dan layar TV. Ikut tercadang. Ekspor Excel tidak memuat gambar.
- **Cetak kartu masal**: menu Cetak Kartu Masal, pilih beberapa/semua member, cetak langsung atau Simpan PDF A4 (10 kartu per lembar, garis potong). Tombol WA Kartu mengirim template Selamat Datang + PDF kartu.
- **Kamera check-in** di tablet bisa digeser dan diperkecil. Daftar member punya tombol **WA Kartu**.

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
- `index.html`, `app.css`, `app.js`, `ui.js`: aplikasi; `sync.js`: backup Supabase; `ext.js`: konfirmasi, pilih banyak, backup; `card.js`, `qr.js`: kartu member; `scan.js`: scanner; `print.js`: printer struk; `pay.js`: trainer dan gaji; `xlsx.js`: export Excel; `extra.js`: promo, opname, WhatsApp massal
- `manifest.webmanifest`, `sw.js`, `icons/`: PWA dan mode offline
- `supabase/`: `backup.sql` (tabel backup) dan panduan; `legacy-schema.sql` = skema sinkron lama (tidak dipakai lagi)
- `php/`: versi PHP + SQLite untuk XAMPP (validasi izin di server). Lihat `php/README.md`.

## Catatan keamanan
User dan role disimpan lokal di perangkat dan dibatasi oleh aplikasi itu sendiri, jadi orang yang menguasai perangkat dan browser-nya dapat mengubah data lokal. Backup di Supabase hanya bisa dibaca akun backup (Row Level Security) dan berisi hash password user.

## WhatsApp: batasan
Aplikasi membuka WhatsApp dengan nomor dan pesan sudah terisi, lalu Anda menekan kirim. Pengiriman tanpa disentuh sama sekali (otomatis di latar belakang) memerlukan layanan gateway WhatsApp berbayar atau WhatsApp Business API, dan belum dipasang. PDF kartu terlampir otomatis hanya pada ponsel (lembar bagikan). Di komputer, PDF diunduh lalu dilampirkan manual.

## Batasan perangkat
Printer, scanner, dan kamera memakai Web Bluetooth/WebUSB/Web Serial dan BarcodeDetector: berjalan di Chrome/Edge (Android dan komputer), tidak di iPhone/iPad. Backup otomatis hanya berjalan saat aplikasi terbuka dan online.
