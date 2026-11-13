<?php
require __DIR__ . '/bootstrap.php';
require_perm('log.view');

render_header('Activity Log', 'activity');
echo '<div class="card"><table><tr><th>Waktu</th><th>User</th><th>Aksi</th><th>Detail</th><th>IP</th></tr>';
foreach (rows('SELECT l.*, u.username FROM activity_log l LEFT JOIN users u ON u.id=l.user_id ORDER BY l.id DESC LIMIT 200') as $l)
    echo '<tr><td>' . h($l['created_at']) . '</td><td>' . h($l['username'] ?? '-') . '</td><td>' . h($l['action']) . '</td><td>' . h($l['detail']) . '</td><td>' . h($l['ip']) . '</td></tr>';
echo '</table></div>';
render_footer();
