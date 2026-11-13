<?php
declare(strict_types=1);

session_name('pinagym_sid');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
if (session_status() !== PHP_SESSION_ACTIVE) session_start();

// ---------- helper DB ----------
function q(string $sql, array $p = []): PDOStatement { $s = db()->prepare($sql); $s->execute($p); return $s; }
function rows(string $sql, array $p = []): array { return q($sql, $p)->fetchAll(); }
function row(string $sql, array $p = []): ?array { $r = q($sql, $p)->fetch(); return $r ?: null; }
function val(string $sql, array $p = []) { $r = q($sql, $p)->fetchColumn(); return $r === false ? null : $r; }
function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function rp($n): string { return 'Rp ' . number_format((float)$n, 0, ',', '.'); }
function setting(string $k, string $d = ''): string { $v = val('SELECT v FROM settings WHERE k=?', [$k]); return $v === null ? $d : (string)$v; }
function save_setting(string $k, string $v): void { q('INSERT INTO settings(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v', [$k, $v]); }
function redirect(string $u): never { header('Location: ' . $u); exit; }
function flash(?string $m = null, string $t = 'ok')
{
    if ($m !== null) { $_SESSION['flash'] = [$m, $t]; return null; }
    $f = $_SESSION['flash'] ?? null; unset($_SESSION['flash']); return $f;
}

// ---------- session timeout ----------
if (!empty($_SESSION['uid'])) {
    $to = max(1, (int)setting('session_timeout', '30')) * 60;
    if (time() - ($_SESSION['last'] ?? time()) > $to) {
        session_unset(); session_destroy(); session_start(); session_regenerate_id(true);
        flash('Sesi berakhir karena tidak aktif. Silakan login kembali.', 'err');
        redirect('login.php');
    }
    $_SESSION['last'] = time();
}

// ---------- user & permission ----------
function current_user(): ?array
{
    static $u = false;
    if ($u !== false) return $u;
    if (empty($_SESSION['uid'])) return $u = null;
    $u = row('SELECT u.*, r.name AS role, r.label AS role_label FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=? AND u.active=1', [$_SESSION['uid']]);
    if (!$u) $_SESSION = [];
    return $u;
}

/** Permission efektif = permission role, lalu dikoreksi override per-user (allow/deny). */
function user_perms(): array
{
    static $c = null;
    if ($c !== null) return $c;
    $u = current_user();
    if (!$u) return $c = [];
    $c = array_flip(array_column(rows('SELECT perm FROM role_permissions WHERE role_id=?', [$u['role_id']]), 'perm'));
    foreach (rows('SELECT perm,allow FROM user_permissions WHERE user_id=?', [$u['id']]) as $o) {
        if ($o['allow']) $c[$o['perm']] = 1; else unset($c[$o['perm']]);
    }
    if ($u['role'] === 'admin') { $c['user.manage'] = 1; $c['permission.manage'] = 1; } // anti lock-out
    return $c;
}

/** $p: satu permission atau array (salah satu cukup). */
function can($p): bool
{
    $set = user_perms();
    foreach ((array)$p as $x) if (isset($set[$x])) return true;
    return false;
}

function role_is(string ...$r): bool { $u = current_user(); return $u && in_array($u['role'], $r, true); }

// ---------- CSRF ----------
function csrf_token(): string { return $_SESSION['csrf'] ??= bin2hex(random_bytes(32)); }
function csrf_field(): string { return '<input type="hidden" name="csrf" value="' . h(csrf_token()) . '">'; }
function csrf_check(): void
{
    if (!hash_equals($_SESSION['csrf'] ?? '', (string)($_POST['csrf'] ?? ''))) {
        http_response_code(419);
        exit('Token keamanan tidak valid. Muat ulang halaman dan coba lagi.');
    }
}

// ---------- guard ----------
function log_act(string $action, string $detail = ''): void
{
    q('INSERT INTO activity_log(user_id,action,detail,ip,created_at) VALUES(?,?,?,?,?)',
        [$_SESSION['uid'] ?? null, $action, $detail, $_SERVER['REMOTE_ADDR'] ?? '', date('Y-m-d H:i:s')]);
}

function require_login(): array
{
    $u = current_user();
    if (!$u) redirect('login.php');
    if ($_SERVER['REQUEST_METHOD'] === 'POST') csrf_check();
    return $u;
}

/** Dipanggil di AWAL setiap halaman: validasi login + CSRF (POST) + permission di backend. */
function require_perm($p): array
{
    $u = require_login();
    if (!can($p)) forbidden();
    return $u;
}

function forbidden(): never
{
    log_act('akses_ditolak', ($_SERVER['REQUEST_METHOD'] ?? '') . ' ' . ($_SERVER['REQUEST_URI'] ?? ''));
    http_response_code(403);
    render_header('Akses Ditolak');
    echo '<div class="card center"><h2>403 · Akses ditolak</h2><p>Anda tidak memiliki izin untuk membuka halaman ini.</p><a class="btn" href="dashboard.php">Kembali ke Dashboard</a></div>';
    render_footer();
    exit;
}

function member_status(array $m): array
{
    $today = date('Y-m-d');
    $soon = date('Y-m-d', strtotime('+' . (int)setting('expiring_days', '7') . ' day'));
    if ($m['status'] === 'freeze') return ['Freeze', 'b-gray'];
    if ($m['end_date'] < $today) return ['Expired', 'b-red'];
    if ($m['end_date'] <= $soon) return ['Akan Expired', 'b-amber'];
    return ['Aktif', 'b-green'];
}

function open_shift(?int $uid = null): ?array
{
    return row('SELECT * FROM shifts WHERE user_id=? AND closed_at IS NULL ORDER BY id DESC LIMIT 1', [$uid ?? current_user()['id']]);
}

function new_invoice(): string
{
    $n = (int)val("SELECT COUNT(*) FROM transactions WHERE date(created_at)=?", [date('Y-m-d')]) + 1;
    return 'INV' . date('ymd') . sprintf('%04d', $n);
}
