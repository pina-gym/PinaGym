<?php
require __DIR__ . '/bootstrap.php';
require_perm('report.view');

$from = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($_GET['from'] ?? '')) ? $_GET['from'] : date('Y-m-01');
$to = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($_GET['to'] ?? '')) ? $_GET['to'] : date('Y-m-d');
$p = [$from, $to];
$rev = fn($type) => (int)val("SELECT COALESCE(SUM(total),0) FROM transactions WHERE voided=0 AND type=? AND date(created_at) BETWEEN ? AND ?", array_merge([$type], $p));
render_header('Laporan', 'reports');
echo '<form class="toolbar" method="get"><input type="date" name="from" value="' . h($from) . '"><input type="date" name="to" value="' . h($to) . '"><button class="btn">Tampilkan</button></form>';
echo '<div class="grid">' . stat_card('Membership', rp($rev('membership'))) . stat_card('POS', rp($rev('pos')), '', 'green') . stat_card('Total', rp($rev('membership') + $rev('pos')), '', 'blue');
if (can('report.profit')) {
    $cost = (int)val("SELECT COALESCE(SUM(i.cost*i.qty),0) FROM transaction_items i JOIN transactions t ON t.id=i.transaction_id WHERE t.voided=0 AND date(t.created_at) BETWEEN ? AND ?", $p);
    echo stat_card('Modal Barang', rp($cost), '', 'amber') . stat_card('Keuntungan', rp($rev('membership') + $rev('pos') - $cost), 'laporan terbatas admin', 'green');
}
echo '</div><div class="card"><h2>Pendapatan per Hari</h2><table><tr><th>Tanggal</th><th class="r">Membership</th><th class="r">POS</th><th class="r">Transaksi</th></tr>';
foreach (rows("SELECT date(created_at) d, SUM(CASE WHEN type='membership' THEN total ELSE 0 END) m, SUM(CASE WHEN type='pos' THEN total ELSE 0 END) p, COUNT(*) n FROM transactions WHERE voided=0 AND date(created_at) BETWEEN ? AND ? GROUP BY d ORDER BY d DESC", $p) as $r)
    echo '<tr><td>' . h($r['d']) . '</td><td class="r">' . rp($r['m']) . '</td><td class="r">' . rp($r['p']) . '</td><td class="r">' . $r['n'] . '</td></tr>';
echo '</table></div>';
render_footer();
