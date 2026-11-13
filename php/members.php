<?php
require __DIR__ . '/bootstrap.php';
require_perm('member.view');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = (int)($_POST['id'] ?? 0);
    $m = row('SELECT * FROM members WHERE id=?', [$id]);
    $act = $_POST['action'] ?? '';
    if (!$m) { flash('Member tidak ditemukan.', 'err'); redirect('members.php'); }
    // permission divalidasi per aksi di backend
    if ($act === 'freeze' || $act === 'unfreeze') {
        if (!can('membership.freeze')) forbidden();
        q('UPDATE members SET status=? WHERE id=?', [$act === 'freeze' ? 'freeze' : 'active', $id]);
        log_act('member_' . $act, $m['code']); flash('Status member diperbarui.');
    } elseif ($act === 'delete') {
        if (!can('member.delete')) forbidden();
        q('DELETE FROM checkins WHERE member_id=?', [$id]); q('DELETE FROM members WHERE id=?', [$id]);
        log_act('member_hapus', $m['code'] . ' ' . $m['name']); flash('Member dihapus.');
    } elseif ($act === 'edit') {
        if (!can('member.edit')) forbidden();
        $name = trim((string)$_POST['name']);
        if ($name === '') { flash('Nama wajib diisi.', 'err'); redirect('members.php?edit=' . $id); }
        q('UPDATE members SET name=?, phone=?, address=? WHERE id=?', [$name, trim((string)$_POST['phone']), trim((string)$_POST['address']), $id]);
        log_act('member_edit', $m['code']); flash('Data member disimpan.');
    }
    redirect('members.php');
}

$edit = isset($_GET['edit']) && can('member.edit') ? row('SELECT * FROM members WHERE id=?', [(int)$_GET['edit']]) : null;
$contact = can('member.contact');
$s = trim((string)($_GET['s'] ?? ''));
$f = $_GET['f'] ?? '';
$today = date('Y-m-d');
$soon = date('Y-m-d', strtotime('+' . (int)setting('expiring_days', '7') . ' day'));
$w = ['1=1']; $p = [];
if ($s !== '') { $w[] = '(m.name LIKE ? OR m.code LIKE ?)'; $p[] = "%$s%"; $p[] = "%$s%"; }
if ($f === 'active') { $w[] = "m.status='active' AND m.end_date>=?"; $p[] = $today; }
if ($f === 'soon') { $w[] = "m.status='active' AND m.end_date BETWEEN ? AND ?"; $p[] = $today; $p[] = $soon; }
if ($f === 'expired') { $w[] = 'm.end_date<?'; $p[] = $today; }
if ($f === 'freeze') { $w[] = "m.status='freeze'"; }
$list = rows('SELECT m.*, k.name pkg FROM members m LEFT JOIN packages k ON k.id=m.package_id WHERE ' . implode(' AND ', $w) . ' ORDER BY m.id DESC LIMIT 200', $p);

render_header('Data Member', 'members');
if ($edit) {
    echo '<form method="post" class="card form"><h2>Ubah Member ' . h($edit['code']) . '</h2>' . csrf_field() . '<input type="hidden" name="action" value="edit"><input type="hidden" name="id" value="' . $edit['id'] . '">'
        . '<label>Nama<input name="name" value="' . h($edit['name']) . '" required></label><label>No. HP<input name="phone" value="' . h($edit['phone']) . '"></label>'
        . '<label>Alamat<input name="address" value="' . h($edit['address']) . '"></label><div><button class="btn">Simpan</button> <a class="btn ghost" href="members.php">Batal</a></div></form>';
}
echo '<form class="toolbar" method="get"><input name="s" placeholder="Cari nama / kode" value="' . h($s) . '"><select name="f" onchange="this.form.submit()">';
foreach (['' => 'Semua status', 'active' => 'Aktif', 'soon' => 'Akan expired', 'expired' => 'Expired', 'freeze' => 'Freeze'] as $k => $l)
    echo '<option value="' . $k . '"' . ($f === $k ? ' selected' : '') . '>' . $l . '</option>';
echo '</select><button class="btn">Cari</button>' . (can('member.create') ? '<a class="btn ghost" href="register.php">➕ Daftar baru</a>' : '') . '</form>';
if (!$contact) echo '<p class="muted">Akses terbatas: kontak (HP/alamat) disembunyikan untuk role Anda.</p>';
echo '<div class="card"><table><tr><th>Kode</th><th>Nama</th>' . ($contact ? '<th>No. HP</th>' : '') . '<th>Paket</th><th>Berakhir</th><th>Status</th><th></th></tr>';
foreach ($list as $m) {
    [$lbl, $cls] = member_status($m);
    echo '<tr><td>' . h($m['code']) . '</td><td>' . h($m['name']) . '</td>' . ($contact ? '<td>' . h($m['phone']) . '</td>' : '')
        . '<td>' . h($m['pkg']) . '</td><td>' . h($m['end_date']) . '</td><td><span class="badge ' . $cls . '">' . $lbl . '</span></td><td class="pill">';
    if (can('member.edit')) echo '<a class="btn sm ghost" href="members.php?edit=' . $m['id'] . '">Ubah</a>';
    if (can('membership.freeze'))
        echo '<form method="post">' . csrf_field() . '<input type="hidden" name="id" value="' . $m['id'] . '"><input type="hidden" name="action" value="' . ($m['status'] === 'freeze' ? 'unfreeze' : 'freeze') . '"><button class="btn sm ghost">' . ($m['status'] === 'freeze' ? 'Aktifkan' : 'Freeze') . '</button></form>';
    if (can('member.delete'))
        echo '<form method="post" data-confirm="Hapus member ini?">' . csrf_field() . '<input type="hidden" name="id" value="' . $m['id'] . '"><input type="hidden" name="action" value="delete"><button class="btn sm red">Hapus</button></form>';
    echo '</td></tr>';
}
if (!$list) echo '<tr><td colspan="7" class="muted">Tidak ada data.</td></tr>';
echo '</table></div>';
render_footer();
