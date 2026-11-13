<?php
require __DIR__ . '/bootstrap.php';
require_perm('backup.manage');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $tmp = tempnam(sys_get_temp_dir(), 'bk');
    db()->exec('PRAGMA wal_checkpoint(FULL)');
    copy(APP_ROOT . '/data/gym.sqlite', $tmp);
    log_act('backup_unduh');
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="gym-backup-' . date('Ymd-His') . '.sqlite"');
    header('Content-Length: ' . filesize($tmp));
    readfile($tmp); unlink($tmp); exit;
}
render_header('Backup Database', 'backup');
echo '<form method="post" class="card form">' . csrf_field() . '<p>Unduh salinan lengkap database saat ini.</p><button class="btn">💾 Unduh Backup</button></form>';
render_footer();
