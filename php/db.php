<?php
declare(strict_types=1);

/** Koneksi PDO (SQLite untuk demo; skema kompatibel untuk dipindah ke MySQL/Postgres). */
function db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $dir = APP_ROOT . '/data';
    if (!is_dir($dir)) mkdir($dir, 0775, true);
    @file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n");
    $file = $dir . '/gym.sqlite';
    $new = !file_exists($file);
    $pdo = new PDO('sqlite:' . $file);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec('PRAGMA foreign_keys=ON');
    if ($new) install($pdo);
    return $pdo;
}

function permission_catalog(): array
{
    return [
        'member.view' => ['Lihat data member', 'Member'],
        'member.contact' => ['Lihat kontak member (HP/alamat)', 'Member'],
        'member.create' => ['Daftarkan member', 'Member'],
        'member.edit' => ['Ubah data member', 'Member'],
        'member.delete' => ['Hapus member', 'Member'],
        'member.extend' => ['Perpanjang membership', 'Member'],
        'membership.freeze' => ['Freeze membership', 'Member'],
        'package.view' => ['Lihat paket membership', 'Member'],
        'package.manage' => ['Kelola paket membership', 'Member'],
        'attendance.checkin' => ['QR check-in', 'Kehadiran'],
        'attendance.view' => ['Riwayat kunjungan', 'Kehadiran'],
        'pos.access' => ['Akses POS', 'Penjualan'],
        'pos.checkout' => ['Checkout POS', 'Penjualan'],
        'pos.cancel' => ['Batalkan (void) transaksi', 'Penjualan'],
        'pos.reprint' => ['Cetak ulang struk', 'Penjualan'],
        'product.view' => ['Lihat produk & stok', 'Penjualan'],
        'product.manage' => ['Kelola produk & harga', 'Penjualan'],
        'product.cost' => ['Lihat harga modal', 'Penjualan'],
        'transaction.view' => ['Riwayat transaksi', 'Penjualan'],
        'transaction.all' => ['Lihat transaksi semua kasir', 'Penjualan'],
        'transaction.delete' => ['Hapus transaksi permanen', 'Penjualan'],
        'shift.own' => ['Buka/tutup shift sendiri', 'Penjualan'],
        'shift.manage' => ['Kelola semua shift', 'Penjualan'],
        'report.view' => ['Lihat laporan', 'Laporan'],
        'report.profit' => ['Lihat laporan keuntungan', 'Laporan'],
        'tv.view' => ['Dashboard TV', 'Sistem'],
        'whatsapp.manage' => ['Kelola template WhatsApp', 'Sistem'],
        'whatsapp.send' => ['Kirim WhatsApp (template)', 'Sistem'],
        'user.manage' => ['Manajemen user', 'Sistem'],
        'permission.manage' => ['Kelola hak akses', 'Sistem'],
        'gym.settings' => ['Pengaturan gym', 'Sistem'],
        'settings.manage' => ['Pengaturan sistem', 'Sistem'],
        'backup.manage' => ['Backup database', 'Sistem'],
        'log.view' => ['Lihat activity log', 'Sistem'],
    ];
}

function role_defaults(): array
{
    $all = array_keys(permission_catalog());
    return [
        'admin' => $all,
        'kasir' => ['pos.access', 'pos.checkout', 'pos.reprint', 'member.view', 'member.create', 'member.extend',
            'package.view', 'product.view', 'transaction.view', 'shift.own'],
        'receptionist' => ['member.view', 'member.contact', 'member.create', 'member.edit', 'member.extend',
            'membership.freeze', 'package.view', 'attendance.checkin', 'attendance.view', 'whatsapp.send'],
    ];
}

function install(PDO $p): void
{
    $p->exec("
    CREATE TABLE roles(id INTEGER PRIMARY KEY, name TEXT UNIQUE, label TEXT);
    CREATE TABLE role_permissions(role_id INTEGER, perm TEXT, PRIMARY KEY(role_id,perm));
    CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, username TEXT UNIQUE, password_hash TEXT,
        role_id INTEGER, active INTEGER DEFAULT 1, created_at TEXT);
    CREATE TABLE user_permissions(user_id INTEGER, perm TEXT, allow INTEGER, PRIMARY KEY(user_id,perm));
    CREATE TABLE packages(id INTEGER PRIMARY KEY, name TEXT, type TEXT DEFAULT 'membership',
        duration_days INTEGER DEFAULT 0, sessions INTEGER DEFAULT 0, price INTEGER, active INTEGER DEFAULT 1);
    CREATE TABLE members(id INTEGER PRIMARY KEY, code TEXT UNIQUE, name TEXT, phone TEXT, address TEXT,
        package_id INTEGER, start_date TEXT, end_date TEXT, status TEXT DEFAULT 'active', created_at TEXT);
    CREATE TABLE products(id INTEGER PRIMARY KEY, name TEXT, price INTEGER, cost INTEGER, stock INTEGER, active INTEGER DEFAULT 1);
    CREATE TABLE shifts(id INTEGER PRIMARY KEY, user_id INTEGER, opened_at TEXT, closed_at TEXT,
        opening_cash INTEGER DEFAULT 0, closing_cash INTEGER);
    CREATE TABLE transactions(id INTEGER PRIMARY KEY, invoice TEXT, type TEXT, user_id INTEGER, member_id INTEGER,
        total INTEGER, method TEXT, shift_id INTEGER, voided INTEGER DEFAULT 0, created_at TEXT);
    CREATE TABLE transaction_items(id INTEGER PRIMARY KEY, transaction_id INTEGER, product_id INTEGER,
        name TEXT, qty INTEGER, price INTEGER, cost INTEGER DEFAULT 0);
    CREATE TABLE checkins(id INTEGER PRIMARY KEY, member_id INTEGER, created_at TEXT);
    CREATE TABLE activity_log(id INTEGER PRIMARY KEY, user_id INTEGER, action TEXT, detail TEXT, ip TEXT, created_at TEXT);
    CREATE TABLE settings(k TEXT PRIMARY KEY, v TEXT);
    CREATE TABLE wa_templates(id INTEGER PRIMARY KEY, name TEXT, body TEXT);
    CREATE INDEX i_tx_date ON transactions(created_at);
    CREATE INDEX i_ci_date ON checkins(created_at);
    ");
    seed($p);
}

function seed(PDO $p): void
{
    mt_srand(7);
    $now = date('Y-m-d H:i:s');
    $d = fn(int $o): string => (new DateTime('today'))->modify(($o >= 0 ? '+' : '') . $o . ' day')->format('Y-m-d');

    // Roles & permissions
    $labels = ['admin' => 'Admin', 'kasir' => 'Kasir', 'receptionist' => 'Receptionist', ];
    $rid = [];
    foreach ($labels as $n => $l) {
        $p->prepare('INSERT INTO roles(name,label) VALUES(?,?)')->execute([$n, $l]);
        $rid[$n] = (int)$p->lastInsertId();
    }
    foreach (role_defaults() as $role => $perms)
        foreach ($perms as $pm)
            $p->prepare('INSERT INTO role_permissions VALUES(?,?)')->execute([$rid[$role], $pm]);

    // Users (password demo)
    $users = [
        ['Administrator', 'admin', 'admin123', 'admin'],
        ['Rina Kasir', 'kasir', 'kasir123', 'kasir'],
        ['Dewi Resepsionis', 'resepsionis', 'resepsionis123', 'receptionist'],
    ];
    foreach ($users as $u)
        $p->prepare('INSERT INTO users(name,username,password_hash,role_id,created_at) VALUES(?,?,?,?,?)')
            ->execute([$u[0], $u[1], password_hash($u[2], PASSWORD_DEFAULT), $rid[$u[3]], $now]);

    foreach ([['gym_name', 'PinaGym'], ['gym_address', 'Jl. Raya Subang No. 12'], ['gym_phone', '081234567890'],
        ['session_timeout', '30'], ['expiring_days', '7']] as $s)
        $p->prepare('INSERT INTO settings VALUES(?,?)')->execute($s);

    foreach ([['Pengingat Expired', "Halo {nama}, membership Anda di {gym} akan berakhir pada {tanggal}. Yuk perpanjang agar latihan tetap lancar!"],
        ['Selamat Datang', "Selamat bergabung di {gym}, {nama}! Kode member Anda: {kode}."],
        ['Membership Habis', "Halo {nama}, membership Anda sudah berakhir pada {tanggal}. Hubungi kami untuk perpanjangan."]] as $t)
        $p->prepare('INSERT INTO wa_templates(name,body) VALUES(?,?)')->execute($t);

    // Paket
    foreach ([['Harian', 'membership', 1, 0, 25000], ['Bulanan', 'membership', 30, 0, 250000],
        ['3 Bulan', 'membership', 90, 0, 650000], ['Tahunan', 'membership', 365, 0, 2200000]] as $k)
        $p->prepare('INSERT INTO packages(name,type,duration_days,sessions,price) VALUES(?,?,?,?,?)')->execute($k);
    $dur = [1 => 1, 2 => 30, 3 => 90, 4 => 365];
    $pkgPrice = [1 => 25000, 2 => 250000, 3 => 650000, 4 => 2200000];

    // Produk
    foreach ([['Air Mineral', 5000, 2500, 120], ['Protein Shake', 25000, 15000, 40], ['Whey Sachet', 30000, 20000, 8],
        ['Handuk Gym', 35000, 20000, 25], ['Sarung Tangan', 85000, 55000, 6], ['Minuman Isotonik', 10000, 6000, 60]] as $pr)
        $p->prepare('INSERT INTO products(name,price,cost,stock) VALUES(?,?,?,?)')->execute($pr);

    // Member
    $names = ['Andi Saputra', 'Bima Pratama', 'Citra Lestari', 'Dian Permata', 'Eko Wijaya', 'Fajar Nugroho', 'Gita Anjani',
        'Hendra Kusuma', 'Intan Maharani', 'Joko Susilo', 'Kiki Amelia', 'Lukman Hakim', 'Maya Sari', 'Naufal Rizky',
        'Putri Ayu', 'Rudi Hartono', 'Sinta Dewi', 'Tono Wibowo', 'Umar Faruq', 'Vina Oktavia', 'Wahyu Hidayat',
        'Yuni Astuti', 'Zaki Ramadhan', 'Agus Salim'];
    $ends = [20, 45, 3, 5, -4, -10, 60, 100, 2, 200, 15, -30, 7, 25, 80, 1, -2, 30, 50, 12, 6, 90, -15, 40];
    $pkgOf = [2, 3, 2, 2, 2, 2, 3, 4, 2, 4, 2, 2, 2, 2, 3, 2, 2, 2, 3, 2, 2, 3, 2, 2];
    $memberIds = [];
    foreach ($names as $i => $n) {
        $pk = $pkgOf[$i];
        $end = $d($ends[$i]);
        $start = $d($ends[$i] - $dur[$pk]);
        $status = in_array($i, [5, 17], true) ? 'freeze' : 'active';
        if ($status === 'freeze') $end = $d(20);
        $p->prepare('INSERT INTO members(code,name,phone,address,package_id,start_date,end_date,status,created_at) VALUES(?,?,?,?,?,?,?,?,?)')
            ->execute([sprintf('GYM%04d', $i + 1), $n, '08' . mt_rand(1100000000, 1999999999), 'Subang, Jawa Barat', $pk, $start, $end, $status, $start . ' 09:00:00']);
        $memberIds[] = (int)$p->lastInsertId();
    }

    // Shift, transaksi, check-in 14 hari
    $inv = 0;
    for ($o = -13; $o <= 0; $o++) {
        $date = $d($o);
        $p->prepare('INSERT INTO shifts(user_id,opened_at,closed_at,opening_cash,closing_cash) VALUES(2,?,?,200000,?)')
            ->execute([$date . ' 07:00:00', $o < 0 ? $date . ' 21:00:00' : null, $o < 0 ? mt_rand(500000, 1500000) : null]);
        $sid = (int)$p->lastInsertId();
        for ($t = 0; $t < mt_rand(1, 3); $t++) {
            $pk = [1, 2, 2, 3, 4][mt_rand(0, 4)];
            $p->prepare('INSERT INTO transactions(invoice,type,user_id,member_id,total,method,shift_id,created_at) VALUES(?,?,?,?,?,?,?,?)')
                ->execute([sprintf('INV%s%04d', date('ymd', strtotime($date)), ++$inv), 'membership', mt_rand(2, 3), $memberIds[mt_rand(0, 23)], $pkgPrice[$pk], ['cash', 'noncash'][mt_rand(0, 1)], $sid, $date . ' ' . mt_rand(8, 19) . ':' . mt_rand(10, 59) . ':00']);
            $tid = (int)$p->lastInsertId();
            $p->prepare('INSERT INTO transaction_items(transaction_id,name,qty,price,cost) VALUES(?,?,1,?,0)')->execute([$tid, 'Membership ' . ['', 'Harian', 'Bulanan', '3 Bulan', 'Tahunan'][$pk], $pkgPrice[$pk]]);
        }
        for ($t = 0; $t < mt_rand(3, 6); $t++) {
            $prod = $p->query('SELECT * FROM products WHERE id=' . mt_rand(1, 6))->fetch();
            $qty = mt_rand(1, 3);
            $p->prepare('INSERT INTO transactions(invoice,type,user_id,total,method,shift_id,created_at) VALUES(?,?,?,?,?,?,?)')
                ->execute([sprintf('INV%s%04d', date('ymd', strtotime($date)), ++$inv), 'pos', 2, $prod['price'] * $qty, ['cash', 'cash', 'noncash'][mt_rand(0, 2)], $sid, $date . ' ' . mt_rand(8, 20) . ':' . mt_rand(10, 59) . ':00']);
            $tid = (int)$p->lastInsertId();
            $p->prepare('INSERT INTO transaction_items(transaction_id,product_id,name,qty,price,cost) VALUES(?,?,?,?,?,?)')->execute([$tid, $prod['id'], $prod['name'], $qty, $prod['price'], $prod['cost']]);
        }
        for ($c = 0; $c < mt_rand(8, 18); $c++)
            $p->prepare('INSERT INTO checkins(member_id,created_at) VALUES(?,?)')
                ->execute([$memberIds[mt_rand(0, 23)], $date . ' ' . sprintf('%02d:%02d:00', mt_rand(6, 20), mt_rand(0, 59))]);
    }
}
