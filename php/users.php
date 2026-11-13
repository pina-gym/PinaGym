<?php
require __DIR__ . '/bootstrap.php';
$me = require_perm('user.manage');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $a = $_POST['action'] ?? '';
    if ($a === 'add') {
        $un = trim((string)$_POST['username']); $pw = (string)$_POST['password']; $name = trim((string)$_POST['name']);
        if ($un === '' || $name === '' || strlen($pw) < 6) flash('Nama, username, dan password (min. 6 karakter) wajib.', 'err');
        elseif (val('SELECT COUNT(*) FROM users WHERE username=?', [$un])) flash('Username sudah dipakai.', 'err');
        elseif (!val('SELECT COUNT(*) FROM roles WHERE id=?', [(int)$_POST['role_id']])) flash('Role tidak valid.', 'err');
        else {
            q('INSERT INTO users(name,username,password_hash,role_id,created_at) VALUES(?,?,?,?,?)', [$name, $un, password_hash($pw, PASSWORD_DEFAULT), (int)$_POST['role_id'], date('Y-m-d H:i:s')]);
            log_act('user_tambah', $un); flash('User ditambahkan.');
        }
    } elseif ($a === 'toggle' && (int)$_POST['id'] !== (int)$me['id']) {
        q('UPDATE users SET active=1-active WHERE id=?', [(int)$_POST['id']]); log_act('user_toggle', '#' . (int)$_POST['id']); flash('Status user diubah.');
    } elseif ($a === 'password') {
        if (strlen((string)$_POST['password']) < 6) flash('Password minimal 6 karakter.', 'err');
        else { q('UPDATE users SET password_hash=? WHERE id=?', [password_hash((string)$_POST['password'], PASSWORD_DEFAULT), (int)$_POST['id']]); log_act('user_reset_password', '#' . (int)$_POST['id']); flash('Password diperbarui.'); }
    }
    redirect('users.php');
}
$roles = rows('SELECT * FROM roles ORDER BY id');
render_header('Manajemen User', 'users');
echo '<div class="card"><table><tr><th>Nama</th><th>Username</th><th>Role</th><th>Status</th><th></th></tr>';
foreach (rows('SELECT u.*, r.label FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.id') as $x) {
    echo '<tr><td>' . h($x['name']) . '</td><td>' . h($x['username']) . '</td><td>' . h($x['label']) . '</td><td><span class="badge ' . ($x['active'] ? 'b-green' : 'b-gray') . '">' . ($x['active'] ? 'Aktif' : 'Nonaktif') . '</span></td><td class="pill">'
        . '<a class="btn sm ghost" href="permissions.php?user=' . $x['id'] . '">Hak akses</a>'
        . '<form method="post" class="pill">' . csrf_field() . '<input type="hidden" name="action" value="password"><input type="hidden" name="id" value="' . $x['id'] . '"><input name="password" type="password" placeholder="Password baru" style="width:140px"><button class="btn sm ghost">Reset</button></form>';
    if ($x['id'] != $me['id']) echo '<form method="post">' . csrf_field() . '<input type="hidden" name="action" value="toggle"><input type="hidden" name="id" value="' . $x['id'] . '"><button class="btn sm ghost">' . ($x['active'] ? 'Nonaktifkan' : 'Aktifkan') . '</button></form>';
    echo '</td></tr>';
}
echo '</table></div><form method="post" class="card form wide">' . csrf_field() . '<input type="hidden" name="action" value="add"><label>Nama<input name="name" required></label><label>Username<input name="username" required></label><label>Password<input name="password" type="password" required></label><label>Role<select name="role_id">';
foreach ($roles as $r) echo '<option value="' . $r['id'] . '">' . h($r['label']) . '</option>';
echo '</select></label><button class="btn">Tambah User</button></form>';
render_footer();
