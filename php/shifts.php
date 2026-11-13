<?php
require __DIR__ . '/bootstrap.php';
$u = require_perm(['shift.own', 'shift.manage']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $a = $_POST['action'] ?? '';
    if ($a === 'open' && can('shift.own') && !open_shift()) {
        q('INSERT INTO shifts(user_id,opened_at,opening_cash) VALUES(?,?,?)', [$u['id'], date('Y-m-d H:i:s'), max(0, (int)$_POST['cash'])]);
        log_act('shift_buka'); flash('Shift dibuka.');
    } elseif ($a === 'close') {
        $s = row('SELECT * FROM shifts WHERE id=? AND closed_at IS NULL', [(int)$_POST['id']]);
        // kasir hanya boleh menutup shift miliknya sendiri; admin (shift.manage) boleh semua
        if ($s && ($s['user_id'] == $u['id'] ? can(['shift.own', 'shift.manage']) : can('shift.manage'))) {
            q('UPDATE shifts SET closed_at=?, closing_cash=? WHERE id=?', [date('Y-m-d H:i:s'), max(0, (int)$_POST['cash']), $s['id']]);
            log_act('shift_tutup', '#' . $s['id']); flash('Shift ditutup.');
        } else forbidden();
    }
    redirect('shifts.php');
}
$mine = open_shift();
$manage = can('shift.manage');
render_header('Shift Kasir', 'shifts');
if (can('shift.own')) {
    echo '<div class="card"><h2>Shift Saya</h2>';
    if ($mine) {
        $sum = (int)val('SELECT COALESCE(SUM(total),0) FROM transactions WHERE shift_id=? AND voided=0', [$mine['id']]);
        echo '<p>Dibuka ' . h(substr($mine['opened_at'], 0, 16)) . ' · Kas awal ' . rp($mine['opening_cash']) . ' · Penjualan ' . rp($sum) . '</p><form method="post" class="form wide" data-confirm="Tutup shift?">' . csrf_field() . '<input type="hidden" name="action" value="close"><input type="hidden" name="id" value="' . $mine['id'] . '"><label>Kas akhir<input type="number" name="cash" min="0" required></label><button class="btn red">Tutup Shift</button></form>';
    } else echo '<form method="post" class="form wide">' . csrf_field() . '<input type="hidden" name="action" value="open"><label>Kas awal<input type="number" name="cash" value="0" min="0"></label><button class="btn">Buka Shift</button></form>';
    echo '</div>';
}
$w = $manage ? '' : ' WHERE s.user_id=' . (int)$u['id'];
echo '<div class="card"><h2>Riwayat Shift</h2><table><tr><th>Kasir</th><th>Buka</th><th>Tutup</th><th class="r">Kas awal</th><th class="r">Kas akhir</th><th class="r">Penjualan</th><th></th></tr>';
foreach (rows('SELECT s.*, u.name, (SELECT COALESCE(SUM(total),0) FROM transactions t WHERE t.shift_id=s.id AND t.voided=0) sales FROM shifts s JOIN users u ON u.id=s.user_id' . $w . ' ORDER BY s.id DESC LIMIT 20') as $s) {
    echo '<tr><td>' . h($s['name']) . '</td><td>' . h(substr($s['opened_at'], 0, 16)) . '</td><td>' . ($s['closed_at'] ? h(substr($s['closed_at'], 0, 16)) : '<span class="badge b-green">Terbuka</span>') . '</td><td class="r">' . rp($s['opening_cash']) . '</td><td class="r">' . ($s['closing_cash'] !== null ? rp($s['closing_cash']) : '-') . '</td><td class="r">' . rp($s['sales']) . '</td><td>';
    if (!$s['closed_at'] && $manage && $s['user_id'] != $u['id'])
        echo '<form method="post" data-confirm="Tutup paksa shift ini?">' . csrf_field() . '<input type="hidden" name="action" value="close"><input type="hidden" name="id" value="' . $s['id'] . '"><input type="hidden" name="cash" value="0"><button class="btn sm ghost">Tutup paksa</button></form>';
    echo '</td></tr>';
}
echo '</table></div>';
render_footer();
