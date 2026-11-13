<?php
require __DIR__ . '/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') redirect('dashboard.php');
csrf_check();
if (!empty($_SESSION['uid'])) log_act('logout');
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $c = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $c['path'], $c['domain'], (bool)$c['secure'], (bool)$c['httponly']);
}
session_destroy();
session_start();
flash('Anda sudah keluar.', 'ok');
redirect('login.php');
