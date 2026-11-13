<?php
require __DIR__ . '/bootstrap.php';
$u = require_perm('transaction.view');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $t = row('SELECT * FROM transactions WHERE id=?', [(int)($_POST['id'] ?? 0)]);
    if (!$t) redirect('transactions.php');
    if (($_POST['action'] ?? '') === 'void') {
        if (!can('pos.cancel')) forbidden();
        if (!$t['voided']) {
            foreach (rows('SELECT * FROM transaction_items WHERE transaction_id=? AND product_id IS NOT NULL', [$t['id']]) as $i) q('UPDATE products SET stock=stock+? WHERE id=?', [$i['qty'], $i['product_id']]);
            q('UPDATE transactions SET voided=1 WHERE id=?', [$t['id']]);
            log_act('transaksi_batal', $t['invoice']); flash('Transaksi dibatalkan (stok dikembalikan).');
        }
    } elseif (($_POST['action'] ?? '') === 'delete') {
        if (!can('transaction.delete')) forbidden(); // hapus permanen: hanya admin
        q('DELETE FROM transaction_items WHERE transaction_id=?', [$t['id']]); q('DELETE FROM transactions WHERE id=?', [$t['id']]);
        log_act('transaksi_hapus_permanen', $t['invoice']); flash('Transaksi dihapus permanen.');
    }
    redirect('transactions.php');
}
$all = can('transaction.all');
$d = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($_GET['d'] ?? '')) ? $_GET['d'] : '';
$w = []; $p = [];
if (!$all) { $w[] = 't.user_id=?'; $p[] = $u['id']; }
if ($d) { $w[] = 'date(t.created_at)=?'; $p[] = $d; }
$list = rows('SELECT t.*, u.name cashier FROM transactions t LEFT JOIN users u ON u.id=t.user_id' . ($w ? ' WHERE ' . implode(' AND ', $w) : '') . ' ORDER BY t.id DESC LIMIT 100', $p);
render_header('Riwayat Transaksi', 'transactions');
echo '<form class="toolbar" method="get"><input type="date" name="d" value="' . h($d) . '"><button class="btn">Filter</button></form>';
if (!$all) echo '<p class="muted">Menampilkan transaksi Anda sendiri.</p>';
echo '<div class="card"><table><tr><th>Invoice</th><th>Waktu</th><th>Jenis</th><th>Kasir</th><th>Metode</th><th class="r">Total</th><th></th></tr>';
foreach ($list as $t) {
    echo '<tr><td>' . h($t['invoice']) . ($t['voided'] ? ' <span class="badge b-red">Batal</span>' : '') . '</td><td>' . h(substr($t['created_at'], 0, 16)) . '</td><td>' . h($t['type']) . '</td><td>' . h($t['cashier']) . '</td><td>' . h($t['method']) . '</td><td class="r">' . rp($t['total']) . '</td><td class="pill">';
    if (can('pos.reprint')) echo '<a class="btn sm ghost" href="receipt.php?id=' . $t['id'] . '&re=1">Struk</a>';
    if (can('pos.cancel') && !$t['voided']) echo '<form method="post" data-confirm="Batalkan transaksi ini?">' . csrf_field() . '<input type="hidden" name="action" value="void"><input type="hidden" name="id" value="' . $t['id'] . '"><button class="btn sm ghost">Batalkan</button></form>';
    if (can('transaction.delete')) echo '<form method="post" data-confirm="HAPUS PERMANEN transaksi ini?">' . csrf_field() . '<input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="' . $t['id'] . '"><button class="btn sm red">Hapus</button></form>';
    echo '</td></tr>';
}
echo '</table></div>';
render_footer();
