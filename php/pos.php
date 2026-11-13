<?php
require __DIR__ . '/bootstrap.php';
$u = require_perm('pos.access');

$sh = open_shift();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!can('pos.checkout')) forbidden();
    if (!$sh) { flash('Buka shift terlebih dahulu di menu Shift Kasir.', 'err'); redirect('shifts.php'); }
    $method = ($_POST['method'] ?? '') === 'noncash' ? 'noncash' : 'cash';
    $items = [];
    foreach ((array)($_POST['qty'] ?? []) as $pid => $qty) {
        $qty = (int)$qty;
        if ($qty < 1) continue;
        $p = row('SELECT * FROM products WHERE id=? AND active=1', [(int)$pid]);
        if (!$p) continue;
        if ($p['stock'] < $qty) { flash('Stok ' . $p['name'] . ' tidak cukup (' . $p['stock'] . ').', 'err'); redirect('pos.php'); }
        $items[] = [$p, $qty]; // harga selalu diambil dari DB, bukan dari input kasir
    }
    if (!$items) { flash('Pilih minimal satu produk.', 'err'); redirect('pos.php'); }
    $db = db(); $db->beginTransaction();
    $total = array_sum(array_map(fn($i) => $i[0]['price'] * $i[1], $items));
    q('INSERT INTO transactions(invoice,type,user_id,total,method,shift_id,created_at) VALUES(?,?,?,?,?,?,?)',
        [new_invoice(), 'pos', $u['id'], $total, $method, $sh['id'], date('Y-m-d H:i:s')]);
    $tid = (int)$db->lastInsertId();
    foreach ($items as [$p, $qty]) {
        q('INSERT INTO transaction_items(transaction_id,product_id,name,qty,price,cost) VALUES(?,?,?,?,?,?)', [$tid, $p['id'], $p['name'], $qty, $p['price'], $p['cost']]);
        q('UPDATE products SET stock=stock-? WHERE id=?', [$qty, $p['id']]);
    }
    $db->commit();
    log_act('pos_checkout', 'tx#' . $tid . ' ' . rp($total));
    redirect('receipt.php?id=' . $tid);
}

render_header('POS Kasir', 'pos');
if (!$sh) echo '<div class="flash err">Shift belum dibuka. <a href="shifts.php"><u>Buka shift</u></a> sebelum bertransaksi.</div>';
echo '<form method="post">' . csrf_field() . '<div class="card"><table><tr><th>Produk</th><th class="r">Harga</th><th class="r">Stok</th><th>Qty</th></tr>';
foreach (rows('SELECT * FROM products WHERE active=1 ORDER BY name') as $p)
    echo '<tr><td>' . h($p['name']) . '</td><td class="r">' . rp($p['price']) . '</td><td class="r">' . $p['stock'] . '</td><td><input class="qty" type="number" min="0" max="' . $p['stock'] . '" value="0" name="qty[' . $p['id'] . ']" data-price="' . $p['price'] . '"></td></tr>';
echo '</table></div><div class="pos-total"><div>Total: <b id="posTotal" style="font-size:22px">Rp 0</b></div><div class="pill"><select name="method" style="width:auto"><option value="cash">Tunai</option><option value="noncash">Non-tunai</option></select><button class="btn"' . ($sh ? '' : ' disabled') . '>Bayar</button></div></div></form>';
render_footer();
