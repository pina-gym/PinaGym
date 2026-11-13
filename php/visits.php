<?php
require __DIR__ . '/bootstrap.php';
require_perm('attendance.view');

$d = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($_GET['d'] ?? '')) ? $_GET['d'] : date('Y-m-d');
render_header('Riwayat Kunjungan', 'visits');
echo '<form class="toolbar" method="get"><input type="date" name="d" value="' . h($d) . '"><button class="btn">Tampilkan</button></form><div class="card"><table><tr><th>Jam</th><th>Kode</th><th>Nama</th></tr>';
$list = rows("SELECT c.created_at, m.code, m.name FROM checkins c JOIN members m ON m.id=c.member_id WHERE date(c.created_at)=? ORDER BY c.created_at DESC", [$d]);
foreach ($list as $c) echo '<tr><td>' . substr($c['created_at'], 11, 5) . '</td><td>' . h($c['code']) . '</td><td>' . h($c['name']) . '</td></tr>';
echo '</table><p class="muted">' . count($list) . ' kunjungan pada ' . h($d) . '</p></div>';
render_footer();
