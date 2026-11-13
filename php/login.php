<?php
require __DIR__ . '/bootstrap.php';
if (current_user()) redirect('dashboard.php');

$err = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $uname = trim((string)($_POST['username'] ?? ''));
    $u = row('SELECT * FROM users WHERE username=? AND active=1', [$uname]);
    // verifikasi selalu dijalankan agar waktu respons seragam
    $ok = password_verify((string)($_POST['password'] ?? ''), $u['password_hash'] ?? '$2y$10$abcdefghijklmnopqrstuuF3Vq5uZ0o5dQzQ4d3k5p0b0m1r3o5K6');
    if ($u && $ok) {
        session_regenerate_id(true);
        $_SESSION['uid'] = (int)$u['id'];
        $_SESSION['last'] = time();
        log_act('login', $u['username']);
        redirect('dashboard.php');
    }
    log_act('login_gagal', $uname);
    $err = 'Username atau password salah.';
}
render_header('Login');
?>
<form method="post" class="auth">
  <h1>🏋 <?= h(setting('gym_name', APP_NAME)) ?></h1>
  <p>Masuk untuk melanjutkan</p>
  <?php if ($err) echo '<div class="flash err">' . h($err) . '</div>';
  if ($f = flash()) echo '<div class="flash err">' . h($f[0]) . '</div>'; ?>
  <?= csrf_field() ?>
  <div class="form">
    <label>Username<input name="username" autocomplete="username" autofocus required></label>
    <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
    <button class="btn">Masuk</button>
  </div>
  <div class="demo"><b>Akun demo</b><br>
    Admin: <code>admin</code> / <code>admin123</code><br>
    Kasir: <code>kasir</code> / <code>kasir123</code><br>
    Receptionist: <code>resepsionis</code> / <code>resepsionis123</code></div>
</form>
<?php render_footer();
