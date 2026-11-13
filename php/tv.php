<?php
require __DIR__ . '/bootstrap.php';
require_perm('tv.view');

$today = date('Y-m-d');
$ci = (int)val('SELECT COUNT(*) FROM checkins WHERE date(created_at)=?', [$today]);
$act = (int)val("SELECT COUNT(*) FROM members WHERE status='active' AND end_date>=?", [$today]);
echo '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="30"><title>TV</title><link rel="stylesheet" href="assets/style.css"></head><body><div class="tvwrap">'
    . '<h1>🏋 ' . h(setting('gym_name')) . '</h1><p>' . date('l, d F Y · H:i') . '</p><div class="tvgrid"><div class="tvcard"><b>' . $ci . '</b>Check-in hari ini</div><div class="tvcard"><b>' . $act . '</b>Member aktif</div></div><h2>Check-in Terbaru</h2><ul style="font-size:22px">';
foreach (rows("SELECT m.name, c.created_at FROM checkins c JOIN members m ON m.id=c.member_id WHERE date(c.created_at)=? ORDER BY c.id DESC LIMIT 8", [$today]) as $c)
    echo '<li>' . substr($c['created_at'], 11, 5) . ' — ' . h($c['name']) . '</li>';
echo '</ul><p><a href="dashboard.php" style="color:#94a3b8">← Kembali</a></p></div></body></html>';
