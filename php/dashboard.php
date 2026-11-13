<?php
require __DIR__ . '/bootstrap.php';
$u = require_login(); // dashboard tersedia untuk semua user login; isi ditentukan role & permission

$today = date('Y-m-d');
$month = date('Y-m-01');
$soon = date('Y-m-d', strtotime('+' . (int)setting('expiring_days', '7') . ' day'));
$days = [];
for ($i = 6; $i >= 0; $i--) $days[] = date('Y-m-d', strtotime("-$i day"));
$dl = array_map(fn($d) => date('d/m', strtotime($d)), $days);

render_header('Dashboard ' . $u['role_label'], 'dashboard');
echo '<p class="muted">Selamat datang, <b>' . h($u['name']) . '</b> · ' . date('d M Y') . '</p>';

$role = $u['role'];
if ($role === 'admin') {
    $tot = (int)val('SELECT COUNT(*) FROM members');
    $act = (int)val("SELECT COUNT(*) FROM members WHERE status='active' AND end_date>=?", [$today]);
    $exp = (int)val("SELECT COUNT(*) FROM members WHERE status='active' AND end_date BETWEEN ? AND ?", [$today, $soon]);
    $xpd = (int)val("SELECT COUNT(*) FROM members WHERE end_date<?", [$today]);
    $new = (int)val('SELECT COUNT(*) FROM members WHERE created_at>=?', [$month]);
    $rm = (int)val("SELECT COALESCE(SUM(total),0) FROM transactions WHERE type='membership' AND voided=0 AND created_at>=?", [$month]);
    $rp = (int)val("SELECT COALESCE(SUM(total),0) FROM transactions WHERE type='pos' AND voided=0 AND created_at>=?", [$month]);
    $trx = (int)val('SELECT COUNT(*) FROM transactions WHERE voided=0 AND created_at>=?', [$month]);
    echo '<div class="grid">' . stat_card('Total Member', $tot) . stat_card('Member Aktif', $act, '', 'green') . stat_card('Akan Expired', $exp, 'dalam ' . setting('expiring_days') . ' hari', 'amber')
        . stat_card('Expired', $xpd, '', 'red') . stat_card('Member Baru', $new, 'bulan ini', 'blue') . stat_card('Pendapatan Membership', rp($rm), 'bulan ini')
        . stat_card('Pendapatan POS', rp($rp), 'bulan ini') . stat_card('Total Transaksi', $trx, 'bulan ini') . '</div>';
    $rev = $vis = [];
    foreach ($days as $d) {
        $rev[] = (int)val("SELECT COALESCE(SUM(total),0) FROM transactions WHERE voided=0 AND date(created_at)=?", [$d]);
        $vis[] = (int)val('SELECT COUNT(*) FROM checkins WHERE date(created_at)=?', [$d]);
    }
    echo '<div class="grid2"><div class="card"><h2>Grafik Pendapatan (7 hari)</h2>' . bar_chart($dl, $rev, 'rp') . '</div>'
        . '<div class="card"><h2>Statistik Pengunjung (7 hari)</h2>' . bar_chart($dl, $vis) . '</div></div>';
    echo '<div class="card"><h2>Notifikasi Sistem</h2><ul>';
    foreach (rows('SELECT name,stock FROM products WHERE stock<=10 AND active=1') as $p) echo '<li>⚠️ Stok <b>' . h($p['name']) . '</b> menipis (' . $p['stock'] . ')</li>';
    if ($exp) echo '<li>⏳ ' . $exp . ' member akan expired dalam ' . h(setting('expiring_days')) . ' hari</li>';
    if ($xpd) echo '<li>❌ ' . $xpd . ' member sudah expired</li>';
    $os = (int)val('SELECT COUNT(*) FROM shifts WHERE closed_at IS NULL');
    if ($os) echo '<li>⏱ ' . $os . ' shift kasir masih terbuka</li>';
    echo '</ul></div>';
} elseif ($role === 'kasir') {
    $uid = $u['id'];
    $n = (int)val("SELECT COUNT(*) FROM transactions WHERE user_id=? AND voided=0 AND date(created_at)=?", [$uid, $today]);
    $sum = (int)val("SELECT COALESCE(SUM(total),0) FROM transactions WHERE user_id=? AND voided=0 AND date(created_at)=?", [$uid, $today]);
    $cash = (int)val("SELECT COUNT(*) FROM transactions WHERE user_id=? AND voided=0 AND method='cash' AND date(created_at)=?", [$uid, $today]);
    $non = $n - $cash;
    $sh = open_shift();
    echo '<div class="grid">' . stat_card('Transaksi Hari Ini', $n) . stat_card('Penjualan Hari Ini', rp($sum), '', 'green') . stat_card('Tunai', $cash) . stat_card('Non-tunai', $non, '', 'blue')
        . stat_card('Status Shift', $sh ? 'Terbuka' : 'Tertutup', $sh ? 'sejak ' . substr($sh['opened_at'], 11, 5) : 'buka shift untuk mulai', $sh ? 'green' : 'red') . '</div>';
    if (can('pos.access')) echo '<p><a class="btn" href="pos.php">🛒 Buka POS Kasir</a></p>';
    echo '<div class="card"><h2>Transaksi Terakhir</h2><table><tr><th>Invoice</th><th>Waktu</th><th>Metode</th><th class="r">Total</th></tr>';
    foreach (rows('SELECT * FROM transactions WHERE user_id=? AND voided=0 ORDER BY id DESC LIMIT 6', [$uid]) as $t)
        echo '<tr><td>' . h($t['invoice']) . '</td><td>' . h(date('H:i', strtotime($t['created_at']))) . '</td><td>' . ($t['method'] === 'cash' ? 'Tunai' : 'Non-tunai') . '</td><td class="r">' . rp($t['total']) . '</td></tr>';
    echo '</table></div>';
} elseif ($role === 'receptionist') {
    $ci = (int)val('SELECT COUNT(*) FROM checkins WHERE date(created_at)=?', [$today]);
    $act = (int)val("SELECT COUNT(*) FROM members WHERE status='active' AND end_date>=?", [$today]);
    $exp = (int)val("SELECT COUNT(*) FROM members WHERE status='active' AND end_date BETWEEN ? AND ?", [$today, $soon]);
    $new = (int)val('SELECT COUNT(*) FROM members WHERE created_at>=?', [$month]);
    $fr = (int)val("SELECT COUNT(*) FROM members WHERE status='freeze'");
    echo '<div class="grid">' . stat_card('Check-in Hari Ini', $ci, '', 'green') . stat_card('Member Aktif', $act) . stat_card('Member Akan Habis', $exp, '', 'amber')
        . stat_card('Member Baru', $new, 'bulan ini', 'blue') . stat_card('Sedang Freeze', $fr) . '</div>';
    echo '<p><a class="btn" href="checkin.php">📷 Check-in</a> <a class="btn ghost" href="register.php">➕ Daftar Member</a></p>';
    echo '<div class="card"><h2>Member Akan Habis</h2><table><tr><th>Kode</th><th>Nama</th><th>Berakhir</th></tr>';
    foreach (rows("SELECT * FROM members WHERE status='active' AND end_date BETWEEN ? AND ? ORDER BY end_date LIMIT 8", [$today, $soon]) as $m)
        echo '<tr><td>' . h($m['code']) . '</td><td>' . h($m['name']) . '</td><td>' . h($m['end_date']) . '</td></tr>';
    echo '</table></div>';
} else {
    echo '<div class="card">Role ini belum memiliki dashboard khusus. Gunakan menu di sebelah kiri sesuai hak akses Anda.</div>';
}
render_footer();
