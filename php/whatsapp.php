<?php
require __DIR__ . '/bootstrap.php';
require_perm(['whatsapp.manage', 'whatsapp.send']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!can('whatsapp.manage')) forbidden(); // hanya admin yang boleh mengubah konfigurasi/template
    q('UPDATE wa_templates SET body=? WHERE id=?', [trim((string)$_POST['body']), (int)$_POST['id']]);
    log_act('wa_template_ubah', '#' . (int)$_POST['id']); flash('Template disimpan.');
    redirect('whatsapp.php');
}
$tpl = rows('SELECT * FROM wa_templates ORDER BY id');
$tid = (int)($_GET['t'] ?? ($tpl[0]['id'] ?? 0));
$cur = null; foreach ($tpl as $t) if ($t['id'] == $tid) $cur = $t;
render_header(can('whatsapp.manage') ? 'WhatsApp Center' : 'WhatsApp Member', 'whatsapp');
$g = $_GET['g'] ?? (($cur['name'] ?? '') === 'Selamat Datang' ? 'new' : 'soon');
$groups = ['new' => 'Member baru (7 hari terakhir)', 'soon' => 'Akan expired (7 hari)', 'expired' => 'Sudah expired', 'all' => 'Semua member'];
if (!isset($groups[$g])) $g = 'new';
echo '<form class="toolbar" method="get"><select name="t" onchange="this.form.submit()">';
foreach ($tpl as $t) echo '<option value="' . $t['id'] . '"' . ($t['id'] == $tid ? ' selected' : '') . '>' . h($t['name']) . '</option>';
echo '</select><select name="g" onchange="this.form.submit()">';
foreach ($groups as $k => $l) echo '<option value="' . $k . '"' . ($k === $g ? ' selected' : '') . '>' . h($l) . '</option>';
echo '</select></form>';
if (can('whatsapp.manage') && $cur)
    echo '<form method="post" class="card form">' . csrf_field() . '<input type="hidden" name="id" value="' . $cur['id'] . '"><label>Isi template (variabel: {nama} {kode} {tanggal} {gym})<textarea name="body" rows="4">' . h($cur['body']) . '</textarea></label><button class="btn">Simpan Template</button></form>';
else echo '<p class="muted">Gunakan template yang disediakan. Isi template tidak dapat diubah oleh role Anda.</p>';
$where = match ($g) {
    'new' => 'date(created_at) >= ?', 'soon' => "status='active' AND end_date BETWEEN ? AND ?",
    'expired' => 'end_date < ?', default => '1=1 OR ?=?',
};
$args = match ($g) { 'new' => [date('Y-m-d', strtotime('-7 day'))], 'soon' => [date('Y-m-d'), date('Y-m-d', strtotime('+7 day'))], 'expired' => [date('Y-m-d')], default => [1, 1] };
echo '<div class="card"><h2>Kirim ke Member</h2><p class="muted">Tombol membuka WhatsApp dengan pesan sudah terisi. Anda tinggal menekan kirim di WhatsApp.</p><table><tr><th>Nama</th><th>Kode</th><th>Berakhir</th><th></th></tr>';
if ($cur) foreach (rows("SELECT * FROM members WHERE $where ORDER BY id DESC LIMIT 50", $args) as $m) {
    $msg = strtr($cur['body'], ['{nama}' => $m['name'], '{kode}' => $m['code'], '{tanggal}' => $m['end_date'], '{gym}' => setting('gym_name')]);
    $no = preg_replace('/^0/', '62', preg_replace('/\D/', '', (string)$m['phone']));
    echo '<tr><td>' . h($m['name']) . '</td><td>' . h($m['code']) . '</td><td>' . h($m['end_date']) . '</td><td>' . (can('whatsapp.send') ? '<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/' . h($no) . '?text=' . rawurlencode($msg) . '">Kirim WA</a>' : '') . '</td></tr>';
}
echo '</table></div>';
render_footer();
