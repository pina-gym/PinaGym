<?php
declare(strict_types=1);

/** Definisi menu tunggal: [kunci, label, file, permission(null=semua user login), ikon, grup]. */
function menu_items(): array
{
    return [
        ['dashboard', 'Dashboard', 'dashboard.php', null, '🏠', 'Utama'],
        ['members', 'Data Member', 'members.php', 'member.view', '👥', 'Member'],
        ['register', 'Pendaftaran Member', 'register.php', 'member.create', '➕', 'Member'],
        ['extend', 'Perpanjangan Membership', 'extend.php', 'member.extend', '🔄', 'Member'],
        ['packages', 'Paket Membership', 'packages.php', 'package.view', '🎫', 'Member'],
        ['checkin', 'QR Check-in', 'checkin.php', 'attendance.checkin', '📷', 'Member'],
        ['visits', 'Riwayat Kunjungan', 'visits.php', 'attendance.view', '🕘', 'Member'],
        ['pos', 'POS Kasir', 'pos.php', 'pos.access', '🛒', 'Penjualan'],
        ['products', 'Produk & Stok', 'products.php', 'product.view', '📦', 'Penjualan'],
        ['transactions', 'Riwayat Transaksi', 'transactions.php', 'transaction.view', '🧾', 'Penjualan'],
        ['reprint', 'Cetak Ulang Struk', 'reprint.php', 'pos.reprint', '🖨', 'Penjualan'],
        ['shifts', 'Shift Kasir', 'shifts.php', ['shift.own', 'shift.manage'], '⏱', 'Penjualan'],
        ['reports', 'Laporan', 'reports.php', 'report.view', '📈', 'Admin'],
        ['tv', 'Dashboard TV', 'tv.php', 'tv.view', '📺', 'Admin'],
        ['whatsapp', 'WhatsApp Center', 'whatsapp.php', ['whatsapp.manage', 'whatsapp.send'], '💬', 'Admin'],
        ['users', 'Manajemen User', 'users.php', 'user.manage', '🔑', 'Sistem'],
        ['permissions', 'Hak Akses', 'permissions.php', 'permission.manage', '🛡', 'Sistem'],
        ['gym', 'Pengaturan Gym', 'gym_settings.php', 'gym.settings', '🏢', 'Sistem'],
        ['system', 'Pengaturan Sistem', 'system_settings.php', 'settings.manage', '⚙️', 'Sistem'],
        ['backup', 'Backup Database', 'backup.php', 'backup.manage', '💾', 'Sistem'],
        ['activity', 'Activity Log', 'activity.php', 'log.view', '📜', 'Sistem'],
    ];
}

/** Menu yang boleh dilihat user (disaring dengan can()). */
function visible_menu(): array
{
    return array_values(array_filter(menu_items(), fn($m) => $m[3] === null || can($m[3])));
}

function quick_keys(): array
{
    return match (current_user()['role'] ?? '') {
        'kasir' => ['dashboard', 'pos', 'transactions', 'shifts'],
        'receptionist' => ['dashboard', 'checkin', 'register', 'members'],
        default => ['dashboard', 'members', 'pos', 'checkin'],
    };
}

function render_header(string $title, string $active = ''): void
{
    $u = current_user();
    $gym = h(setting('gym_name', APP_NAME));
    echo '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
    echo '<meta name="theme-color" content="#0f172a"><title>' . h($title) . ' · ' . $gym . '</title><link rel="stylesheet" href="assets/style.css"></head><body>';
    if (!$u) { echo '<main class="auth-wrap">'; return; }
    echo '<div class="app"><div class="scrim" id="scrim"></div><aside class="side" id="side"><div class="brand">🏋 ' . $gym . '</div><nav>';
    $grp = '';
    foreach (visible_menu() as $m) {
        if ($m[5] !== $grp) { $grp = $m[5]; echo '<div class="grp">' . h($grp) . '</div>'; }
        echo '<a href="' . $m[2] . '" class="' . ($m[0] === $active ? 'on' : '') . '"><span>' . $m[4] . '</span>' . h($m[1]) . '</a>';
    }
    echo '</nav><form method="post" action="logout.php" class="logout">' . csrf_field() . '<button class="btn ghost full">⎋ Keluar</button></form></aside>';
    echo '<div class="main"><header class="top"><button class="burger" id="burger" aria-label="Menu">☰</button><h1>' . h($title) . '</h1>';
    echo '<div class="who"><b>' . h($u['name']) . '</b><small>' . h($u['role_label']) . '</small></div></header><main class="content">';
    if ($f = flash()) echo '<div class="flash ' . ($f[1] === 'err' ? 'err' : 'ok') . '">' . h($f[0]) . '</div>';
}

function render_footer(): void
{
    if (current_user()) {
        $byKey = [];
        foreach (visible_menu() as $m) $byKey[$m[0]] = $m;
        echo '</main></div></div><nav class="bottom">';
        foreach (quick_keys() as $k) if (isset($byKey[$k]))
            echo '<a href="' . $byKey[$k][2] . '"><span>' . $byKey[$k][4] . '</span>' . h(explode(' ', $byKey[$k][1])[0]) . '</a>';
        echo '<a href="#" id="moreBtn"><span>☰</span>Menu</a></nav>';
    } else echo '</main>';
    echo '<script src="assets/app.js"></script></body></html>';
}

function stat_card(string $label, $value, string $sub = '', string $tone = ''): string
{
    return '<div class="stat ' . $tone . '"><small>' . h($label) . '</small><b>' . h((string)$value) . '</b>' . ($sub ? '<em>' . h($sub) . '</em>' : '') . '</div>';
}

/** Bar sederhana (CSS) untuk grafik 7 hari. $series: [label => [nilai...]] */
function bar_chart(array $labels, array $values, string $fmt = 'num'): string
{
    $max = max(1, ...$values);
    $o = '<div class="bars">';
    foreach ($labels as $i => $l) {
        $v = $values[$i];
        $o .= '<div class="bar"><i style="height:' . round($v / $max * 100) . '%" title="' . h($fmt === 'rp' ? rp($v) : (string)$v) . '"></i><small>' . h($l) . '</small></div>';
    }
    return $o . '</div>';
}

/** Halaman pengaturan generik: $fields = [key => [label, tipe]] */
function settings_page(string $title, string $active, string $perm, array $fields): void
{
    require_perm($perm);
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        foreach ($fields as $k => $f) save_setting($k, trim((string)($_POST[$k] ?? '')));
        log_act('ubah_pengaturan', $title);
        flash('Pengaturan disimpan.');
        redirect($_SERVER['PHP_SELF']);
    }
    render_header($title, $active);
    echo '<form method="post" class="card form">' . csrf_field();
    foreach ($fields as $k => $f)
        echo '<label>' . h($f[0]) . '<input name="' . $k . '" type="' . $f[1] . '" value="' . h(setting($k)) . '"' . ($f[1] === 'number' ? ' min="1"' : '') . '></label>';
    echo '<button class="btn">Simpan</button></form>';
    render_footer();
}
