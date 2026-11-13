<?php
require __DIR__ . '/bootstrap.php';
require_perm('package.view');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!can('package.manage')) forbidden();
    $a = $_POST['action'] ?? '';
    if ($a === 'add') {
        $name = trim((string)$_POST['name']); $price = max(0, (int)$_POST['price']); $dur = max(1, (int)$_POST['duration_days']);
        if ($name !== '') { q("INSERT INTO packages(name,type,duration_days,price) VALUES(?,'membership',?,?)", [$name, $dur, $price]); log_act('paket_tambah', $name); flash('Paket ditambahkan.'); }
    } elseif ($a === 'toggle') {
        q('UPDATE packages SET active=1-active WHERE id=?', [(int)$_POST['id']]); log_act('paket_toggle', (string)(int)$_POST['id']);
    }
    redirect('packages.php');
}
render_header('Paket Membership', 'packages');
echo '<div class="card"><table><tr><th>Paket</th><th>Jenis</th><th>Durasi</th><th class="r">Harga</th><th>Status</th><th></th></tr>';
foreach (rows('SELECT * FROM packages ORDER BY type, price') as $k) {
    echo '<tr><td>' . h($k['name']) . '</td><td>' . 'Membership' . '</td><td>' . $k['duration_days'] . ' hari' . '</td><td class="r">' . rp($k['price']) . '</td>'
        . '<td><span class="badge ' . ($k['active'] ? 'b-green' : 'b-gray') . '">' . ($k['active'] ? 'Aktif' : 'Nonaktif') . '</span></td><td>';
    if (can('package.manage')) echo '<form method="post">' . csrf_field() . '<input type="hidden" name="action" value="toggle"><input type="hidden" name="id" value="' . $k['id'] . '"><button class="btn sm ghost">' . ($k['active'] ? 'Nonaktifkan' : 'Aktifkan') . '</button></form>';
    echo '</td></tr>';
}
echo '</table></div>';
if (can('package.manage'))
    echo '<form method="post" class="card form wide">' . csrf_field() . '<input type="hidden" name="action" value="add"><label>Nama paket<input name="name" required></label><label>Durasi (hari)<input name="duration_days" type="number" min="1" required></label><label>Harga<input name="price" type="number" min="0" required></label><button class="btn">Tambah Paket</button></form>';
render_footer();
