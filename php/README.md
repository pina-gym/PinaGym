# PinaGym — Role-Based Dashboard & Dynamic Menu (PHP)

Jalankan demo (butuh PHP 8.1+ dengan pdo_sqlite):

    cd php
    php -S localhost:8080
    # buka http://localhost:8080

Database SQLite dibuat otomatis di data/gym.sqlite beserta data contoh.

Akun demo:
- admin / admin123
- kasir / kasir123
- resepsionis / resepsionis123

Struktur keamanan: auth.php (session, timeout, permission efektif = role + override user, CSRF),
layout.php (menu tunggal yang difilter can()), setiap halaman memanggil require_perm() di baris awal.
Folder data/ dilindungi .htaccess (Apache); pada Nginx, blok akses ke /data.
