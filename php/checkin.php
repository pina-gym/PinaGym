<?php
require __DIR__ . '/bootstrap.php';
require_perm('attendance.checkin');

$res = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $code = strtoupper(trim((string)($_POST['code'] ?? '')));
    $m = row('SELECT * FROM members WHERE code=?', [$code]);
    if (!$m) $res = ['err', "Kode <b>" . h($code) . "</b> tidak ditemukan."];
    else {
        [$lbl] = member_status($m);
        if ($lbl === 'Freeze') $res = ['err', h($m['name']) . ' — membership sedang di-freeze.'];
        elseif ($lbl === 'Expired') $res = ['err', h($m['name']) . ' — membership expired sejak ' . h($m['end_date']) . '.'];
        elseif (val("SELECT COUNT(*) FROM checkins WHERE member_id=? AND date(created_at)=?", [$m['id'], date('Y-m-d')]))
            $res = ['ok', h($m['name']) . ' sudah check-in hari ini.'];
        else {
            q('INSERT INTO checkins(member_id,created_at) VALUES(?,?)', [$m['id'], date('Y-m-d H:i:s')]);
            log_act('checkin', $m['code']);
            $res = ['ok', '✅ Check-in berhasil: <b>' . h($m['name']) . '</b>' . ($lbl === 'Akan Expired' ? ' (berakhir ' . h($m['end_date']) . ')' : '')];
        }
    }
}
render_header('QR Check-in', 'checkin');
if ($res) echo '<div class="flash ' . $res[0] . '">' . $res[1] . '</div>';
echo '<form method="post" class="card form">' . csrf_field() . '<label>Scan QR / ketik kode member<input name="code" autofocus autocomplete="off" placeholder="GYM0001" required></label><button class="btn">Check-in</button>'
    . '<p class="muted">Scanner QR USB berfungsi sebagai keyboard — arahkan kursor ke kolom ini lalu scan.</p></form>';
echo '<div class="card"><h2>Check-in Hari Ini</h2><table><tr><th>Jam</th><th>Kode</th><th>Nama</th></tr>';
foreach (rows("SELECT c.created_at, m.code, m.name FROM checkins c JOIN members m ON m.id=c.member_id WHERE date(c.created_at)=? ORDER BY c.id DESC LIMIT 15", [date('Y-m-d')]) as $c)
    echo '<tr><td>' . substr($c['created_at'], 11, 5) . '</td><td>' . h($c['code']) . '</td><td>' . h($c['name']) . '</td></tr>';
echo '</table></div>';
render_footer();
