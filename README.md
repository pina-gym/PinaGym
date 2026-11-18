# PinaGym

Aplikasi manajemen gym dengan dashboard dan menu yang berbeda untuk tiap role (Admin, Kasir, Trainer). Berjalan sebagai **PWA**: bisa dipasang di HP atau komputer dan tetap bisa dipakai tanpa internet. Data tersimpan di perangkat lebih dulu, dan dicadangkan otomatis setiap hari ke Supabase.

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
- Laporan, activity log, pengaturan, backup dan pulihkan data (JSON).
- Login dengan password ter-hash (PBKDF2), session timeout yang dapat diatur, batas percobaan login.
- **POS sekali ketuk**: produk dan paket membership tampil sebagai tile; ketuk untuk menambah. Tombol mengambang **Lihat pesanan** membuka popup konfirmasi (keranjang dengan +/−, data member/trainer/alamat, diskon, metode bayar, Bayar). Mengetuk paket membership langsung membuka popup pengisian data member.
- **Paket member + trainer**: paket bisa ditandai "termasuk trainer". Saat daftar/perpanjang (menu atau POS) kasir/admin memilih trainer dari daftar; member otomatis masuk ke trainer itu dan tiap check-in tercatat sebagai satu sesi (dasar komisi persentase).
- **Logo gym**: unggah di Pengaturan Gym. Tampil di struk (layar, browser, thermal), kartu member (SVG/PDF), slip & rekap gaji (PDF/cetak), menu samping, login. Ikut tercadang. Ekspor Excel tidak memuat gambar.
- **Cetak kartu masal**: menu Cetak Kartu Masal, pilih beberapa/semua member, cetak langsung atau Simpan PDF A4 (10 kartu per lembar, garis potong). Tombol WA Kartu mengirim template Selamat Datang + PDF kartu.
- **Sesi trainer otomatis**: trainer siaga 24 jam, tidak ada jadwal. Tiap check-in member paket + trainer langsung tercatat sebagai sesi Selesai. Sesi manual tetap bisa dicatat (opsional).
- **Kamera check-in** di tablet bisa digeser dan diperkecil. Daftar member punya tombol **WA Kartu**.
- **Sinkron antar perangkat**: laptop, HP dan tablet berbagi data lewat Supabase (tabel `sync_records`, jalankan `supabase/sync.sql` sekali). Otomatis saat dibuka, tiap 90 detik, beberapa detik setelah ada perubahan dan saat online lagi; juga ada tombol **Sinkron** di bilah atas dan di menu Backup Database. Per data, perubahan terakhir yang menang; hapus ikut tersinkron. Perangkat baru: hubungkan Supabase (akun backup yang sama) lalu pilih "Ambil data dari server". Batas: stok yang diubah di dua perangkat sekaligus bisa tertimpa; jam perangkat sebaiknya akurat.
- **Member harian = catatan kunjungan**: paket 1 hari tidak membuat member, kartu, atau ucapan WhatsApp ; nama wajib diisi, alamat dan nomor WA opsional; tercatat di Data Member → tab Harian. POS bisa mencari pengunjung yang sudah tercatat agar data terisi otomatis (bisa difilter hari ini / 7 hari / bulan ini). Pengunjung bisa di-**Upgrade jadi member** bulanan atau tahunan (isi nama, HP, alamat, trainer bila perlu). Data Member punya tab Bulanan / Harian / Semua.

## Pakai
Buka alamat GitHub Pages repo ini, lalu pasang lewat menu "Pasang aplikasi" / "Add to Home screen".

Akun awal (segera ganti password di menu Manajemen User):

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Kasir | `kasir` | `kasir123` |

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

- **Role Trainer**: hanya bisa membuka menu Trainer dan Sesi Trainer (hanya lihat). Di Manajemen User, user bisa dikaitkan ke satu trainer supaya hanya melihat member dan sesinya sendiri. Role Receptionist sudah dihapus.
- **Total Keseluruhan** (Laporan dan Dashboard admin): omzet harian, mingguan, bulanan, tahunan dan seluruh waktu, dipisah penjualan produk, member harian, member bulanan, member tahunan.
- **Barcode produk**: isi barcode di Produk & Stok; di POS ketik/scan di kolom cari lalu Enter, atau pakai scanner USB/Bluetooth dan kamera.
- **Lonceng notifikasi** (bilah atas, Admin dan Kasir): badge jumlah member yang membership-nya berakhir 7 hari lagi atau habis hari ini; ketuk untuk membuka daftar dan kirim WhatsApp pengingat per member. Yang sudah dikirim hilang dari daftar. Setelah member baru terdaftar, muncul pop up kirim WA selamat datang + kartu.
- **Shift kasir**: buka shift dengan modal awal kas; saat tutup, kasir mengisi kas fisik dan aplikasi menampilkan rekap (produk, member harian/bulanan/tahunan, tunai vs non-tunai/QRIS, kas seharusnya, selisih). Riwayat shift per kasir; admin bisa melihat semua dan menutup paksa shift yang lupa ditutup. POS hanya bisa dipakai bila shift pengguna sedang terbuka.
