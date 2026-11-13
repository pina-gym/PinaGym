<?php
require __DIR__ . '/bootstrap.php';
require_perm('permission.manage');

$catalog = permission_catalog();
$roles = rows('SELECT * FROM roles ORDER BY id');
$users = rows('SELECT u.id,u.name,u.role_id FROM users u ORDER BY u.name');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $a = $_POST['action'] ?? '';
    if ($a === 'role') {
        $r = row('SELECT * FROM roles WHERE id=?', [(int)$_POST['role_id']]);
        if ($r && $r['name'] !== 'admin') { // permission admin dikunci agar tidak terjadi lock-out
            q('DELETE FROM role_permissions WHERE role_id=?', [$r['id']]);
            foreach ((array)($_POST['perm'] ?? []) as $pm) if (isset($catalog[$pm])) q('INSERT INTO role_permissions VALUES(?,?)', [$r['id'], $pm]);
            log_act('permission_role_ubah', $r['name']); flash('Hak akses role ' . $r['label'] . ' disimpan.');
        }
        redirect('permissions.php?role=' . (int)$_POST['role_id']);
    } elseif ($a === 'user') {
        $uid = (int)$_POST['user_id'];
        if (row('SELECT 1 FROM users WHERE id=?', [$uid])) {
            q('DELETE FROM user_permissions WHERE user_id=?', [$uid]);
            foreach ($catalog as $pm => $_) {
                $v = $_POST['ov'][$pm] ?? 'inherit';
                if ($v === 'allow' || $v === 'deny') q('INSERT INTO user_permissions VALUES(?,?,?)', [$uid, $pm, $v === 'allow' ? 1 : 0]);
            }
            log_act('permission_user_ubah', 'user ' . $uid); flash('Override hak akses user disimpan.');
        }
        redirect('permissions.php?user=' . $uid);
    }
}
$rid = (int)($_GET['role'] ?? 0); $uid = (int)($_GET['user'] ?? 0);
if (!$rid && !$uid) $rid = (int)$roles[1]['id'];
render_header('Hak Akses', 'permissions');
echo '<form class="toolbar" method="get"><select name="role" onchange="this.form.submit()"><option value="">— pilih role —</option>';
foreach ($roles as $r) echo '<option value="' . $r['id'] . '"' . ($r['id'] == $rid ? ' selected' : '') . '>' . h($r['label']) . '</option>';
echo '</select></form><form class="toolbar" method="get"><select name="user" onchange="this.form.submit()"><option value="">— atau pengaturan khusus per user —</option>';
foreach ($users as $x) echo '<option value="' . $x['id'] . '"' . ($x['id'] == $uid ? ' selected' : '') . '>' . h($x['name']) . '</option>';
echo '</select></form>';

if ($rid && ($r = row('SELECT * FROM roles WHERE id=?', [$rid]))) {
    $on = array_flip(array_column(rows('SELECT perm FROM role_permissions WHERE role_id=?', [$rid]), 'perm'));
    $locked = $r['name'] === 'admin';
    echo '<form method="post" class="card">' . csrf_field() . '<input type="hidden" name="action" value="role"><input type="hidden" name="role_id" value="' . $rid . '"><h2>Role: ' . h($r['label']) . ($locked ? ' (akses penuh, terkunci)' : '') . '</h2>';
    $grp = '';
    foreach ($catalog as $pm => [$lbl, $g]) {
        if ($g !== $grp) { $grp = $g; echo '<div class="grp" style="color:#64748b;padding:12px 0 4px">' . h($g) . '</div>'; }
        echo '<label style="display:flex;gap:10px;align-items:center;font-weight:400;color:inherit"><input type="checkbox" style="width:auto;min-height:0" name="perm[]" value="' . h($pm) . '"' . (isset($on[$pm]) ? ' checked' : '') . ($locked ? ' disabled' : '') . '> <code>' . h($pm) . '</code> ' . h($lbl) . '</label>';
    }
    echo $locked ? '' : '<p><button class="btn">Simpan Hak Akses Role</button></p>';
    echo '</form>';
}
if ($uid && ($tu = row('SELECT u.*, r.label FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?', [$uid]))) {
    $roleOn = array_flip(array_column(rows('SELECT perm FROM role_permissions WHERE role_id=?', [$tu['role_id']]), 'perm'));
    $ov = array_column(rows('SELECT perm,allow FROM user_permissions WHERE user_id=?', [$uid]), 'allow', 'perm');
    echo '<form method="post" class="card">' . csrf_field() . '<input type="hidden" name="action" value="user"><input type="hidden" name="user_id" value="' . $uid . '"><h2>Pengaturan khusus: ' . h($tu['name']) . ' <small class="muted">(role ' . h($tu['label']) . ')</small></h2><table><tr><th>Permission</th><th>Dari role</th><th>Override</th></tr>';
    foreach ($catalog as $pm => [$lbl]) {
        $cur = !isset($ov[$pm]) ? 'inherit' : ($ov[$pm] ? 'allow' : 'deny');
        echo '<tr><td><code>' . h($pm) . '</code> ' . h($lbl) . '</td><td>' . (isset($roleOn[$pm]) ? '✔' : '✖') . '</td><td><select name="ov[' . h($pm) . ']" style="width:auto">';
        foreach (['inherit' => 'Ikuti role', 'allow' => 'Izinkan', 'deny' => 'Tolak'] as $k => $l) echo '<option value="' . $k . '"' . ($cur === $k ? ' selected' : '') . '>' . $l . '</option>';
        echo '</select></td></tr>';
    }
    echo '</table><p><button class="btn">Simpan Override User</button></p></form>';
}
render_footer();
