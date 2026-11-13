<?php
require __DIR__ . '/bootstrap.php';
$u = require_perm('pos.reprint');

$all = can('transaction.all');
$list = rows('SELECT * FROM transactions WHERE ' . ($all ? '1=1' : 'user_id=' . (int)$u['id']) . ' AND voided=0 ORDER BY id DESC LIMIT 30');
render_header('Cetak Ulang Struk', 'reprint');
echo '<div class="card"><table><tr><th>Invoice</th><th>Waktu</th><th class="r">Total</th><th></th></tr>';
foreach ($list as $t) echo '<tr><td>' . h($t['invoice']) . '</td><td>' . h(substr($t['created_at'], 0, 16)) . '</td><td class="r">' . rp($t['total']) . '</td><td><a class="btn sm" href="receipt.php?id=' . $t['id'] . '&re=1">Cetak</a></td></tr>';
echo '</table></div>';
render_footer();
