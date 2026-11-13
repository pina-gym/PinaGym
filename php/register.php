<?php
require __DIR__ . '/bootstrap.php';
$u = require_perm('member.create');

$pkgs = rows("SELECT * FROM packages WHERE type='membership' AND active=1 ORDER BY price");
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim((string)($_POST['name'] ?? ''));
    $pk = row("SELECT * FROM packages WHERE id=? AND type='membership' AND active=1", [(int)($_POST['package_id'] ?? 0)]);
    $method = ($_POST['method'] ?? '') === 'noncash' ? 'noncash' : 'cash';
    if ($name === '' || !$pk) { flash('Nama dan paket wajib diisi.', 'err'); redirect('register.php'); }
    $db = db(); $db->beginTransaction();
    $code = sprintf('GYM%04d', (int)val('SELECT COALESCE(MAX(id),0) FROM members') + 1);
    $start = date('Y-m-d'); $end = date('Y-m-d', strtotime("+{$pk['duration_days']} day"));
    q('INSERT INTO members(code,name,phone,address,package_id,start_date,end_date,created_at) VALUES(?,?,?,?,?,?,?,?)',
        [$code, $name, trim((string)$_POST['phone']), trim((string)$_POST['address']), $pk['id'], $start, $end, date('Y-m-d H:i:s')]);
    $mid = (int)$db->lastInsertId();
    $sh = open_shift();
    q('INSERT INTO transactions(invoice,type,user_id,member_id,total,method,shift_id,created_at) VALUES(?,?,?,?,?,?,?,?)',
        [new_invoice(), 'membership', $u['id'], $mid, $pk['price'], $method, $sh['id'] ?? null, date('Y-m-d H:i:s')]);
    $tid = (int)$db->lastInsertId();
    q('INSERT INTO transaction_items(transaction_id,name,qty,price) VALUES(?,?,1,?)', [$tid, 'Membership ' . $pk['name'] . ' (' . $code . ')', $pk['price']]);
    $db->commit();
    log_act('member_daftar', $code . ' ' . $name);
    flash("Member $code berhasil didaftarkan.");
    redirect('receipt.php?id=' . $tid);
}
render_header('Pendaftaran Member', 'register');
echo '<form method="post" class="card form">' . csrf_field()
    . '<label>Nama lengkap<input name="name" required></label><label>No. HP<input name="phone" inputmode="tel"></label><label>Alamat<input name="address"></label>'
    . '<label>Paket<select name="package_id">';
foreach ($pkgs as $k) echo '<option value="' . $k['id'] . '">' . h($k['name']) . ' — ' . rp($k['price']) . '</option>';
echo '</select></label><label>Pembayaran<select name="method"><option value="cash">Tunai</option><option value="noncash">Non-tunai</option></select></label><button class="btn">Daftarkan &amp; Bayar</button></form>';
render_footer();
