<?php
require __DIR__ . '/bootstrap.php';
$u = require_perm(['pos.checkout', 'pos.reprint', 'member.create', 'member.extend', 'transaction.all']);

$t = row('SELECT t.*, u.name cashier, m.name member FROM transactions t LEFT JOIN users u ON u.id=t.user_id LEFT JOIN members m ON m.id=t.member_id WHERE t.id=?', [(int)($_GET['id'] ?? 0)]);
if (!$t) { flash('Transaksi tidak ditemukan.', 'err'); redirect('dashboard.php'); }
// kasir biasa hanya boleh melihat/cetak transaksinya sendiri kecuali punya transaction.all
if ($t['user_id'] != $u['id'] && !can('transaction.all')) forbidden();
if (!empty($_GET['re'])) log_act('cetak_ulang', $t['invoice']);

render_header('Struk ' . $t['invoice']);
echo '<div class="receipt"><div style="text-align:center"><b>' . h(setting('gym_name')) . '</b><br>' . h(setting('gym_address')) . '<br>' . h(setting('gym_phone')) . '</div><hr>'
    . '<div class="row"><span>' . h($t['invoice']) . '</span><span>' . h(substr($t['created_at'], 0, 16)) . '</span></div><div>Kasir: ' . h($t['cashier']) . '</div>' . ($t['member'] ? '<div>Member: ' . h($t['member']) . '</div>' : '') . '<hr>';
foreach (rows('SELECT * FROM transaction_items WHERE transaction_id=?', [$t['id']]) as $i)
    echo '<div>' . h($i['name']) . '</div><div class="row"><span>' . $i['qty'] . ' x ' . number_format($i['price'], 0, ',', '.') . '</span><span>' . number_format($i['qty'] * $i['price'], 0, ',', '.') . '</span></div>';
echo '<hr><div class="row"><b>TOTAL</b><b>' . rp($t['total']) . '</b></div><div class="row"><span>Metode</span><span>' . ($t['method'] === 'cash' ? 'Tunai' : 'Non-tunai') . '</span></div>'
    . ($t['voided'] ? '<div style="text-align:center;color:#b91c1c"><b>*** DIBATALKAN ***</b></div>' : '') . '<hr><div style="text-align:center">Terima kasih 🙏</div></div>'
    . '<p class="noprint" style="text-align:center;margin-top:16px"><button class="btn" onclick="window.print()">🖨 Cetak</button> ' . (can('whatsapp.send') && $t['member_id'] ? '<a class="btn ghost" href="whatsapp.php?g=new">💬 Kirim WA Selamat Datang</a> ' : '') . '<a class="btn ghost" href="dashboard.php">Selesai</a></p>';
render_footer();
