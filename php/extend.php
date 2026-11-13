<?php
require __DIR__ . '/bootstrap.php';
$u = require_perm('member.extend');

$pkgs = rows("SELECT * FROM packages WHERE type='membership' AND active=1 ORDER BY price");
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $m = row('SELECT * FROM members WHERE id=?', [(int)($_POST['member_id'] ?? 0)]);
    $pk = row("SELECT * FROM packages WHERE id=? AND type='membership' AND active=1", [(int)($_POST['package_id'] ?? 0)]);
    $method = ($_POST['method'] ?? '') === 'noncash' ? 'noncash' : 'cash';
    if (!$m || !$pk) { flash('Pilih member dan paket.', 'err'); redirect('extend.php'); }
    $base = max($m['end_date'], date('Y-m-d'));
    $end = date('Y-m-d', strtotime($base . " +{$pk['duration_days']} day"));
    $db = db(); $db->beginTransaction();
    q('UPDATE members SET end_date=?, package_id=?, status=? WHERE id=?', [$end, $pk['id'], 'active', $m['id']]);
    $sh = open_shift();
    q('INSERT INTO transactions(invoice,type,user_id,member_id,total,method,shift_id,created_at) VALUES(?,?,?,?,?,?,?,?)',
        [new_invoice(), 'membership', $u['id'], $m['id'], $pk['price'], $method, $sh['id'] ?? null, date('Y-m-d H:i:s')]);
    $tid = (int)$db->lastInsertId();
    q('INSERT INTO transaction_items(transaction_id,name,qty,price) VALUES(?,?,1,?)', [$tid, 'Perpanjangan ' . $pk['name'] . ' (' . $m['code'] . ')', $pk['price']]);
    $db->commit();
    log_act('member_perpanjang', $m['code'] . ' s/d ' . $end);
    flash("Membership {$m['name']} diperpanjang sampai $end.");
    redirect('receipt.php?id=' . $tid);
}
$members = rows('SELECT id,code,name,end_date FROM members ORDER BY name');
render_header('Perpanjangan Membership', 'extend');
echo '<form method="post" class="card form">' . csrf_field() . '<label>Member<select name="member_id">';
foreach ($members as $m) echo '<option value="' . $m['id'] . '">' . h($m['code'] . ' · ' . $m['name'] . ' (s/d ' . $m['end_date'] . ')') . '</option>';
echo '</select></label><label>Paket<select name="package_id">';
foreach ($pkgs as $k) echo '<option value="' . $k['id'] . '">' . h($k['name']) . ' — ' . rp($k['price']) . '</option>';
echo '</select></label><label>Pembayaran<select name="method"><option value="cash">Tunai</option><option value="noncash">Non-tunai</option></select></label>'
    . '<p class="muted">Jika masih aktif, masa baru dihitung dari tanggal berakhir saat ini.</p><button class="btn">Perpanjang &amp; Bayar</button></form>';
render_footer();
