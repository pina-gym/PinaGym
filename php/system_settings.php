<?php
require __DIR__ . '/bootstrap.php';
settings_page('Pengaturan Sistem', 'system', 'settings.manage', ['session_timeout' => ['Session timeout (menit tidak aktif)', 'number'], 'expiring_days' => ['Batas "akan expired" (hari)', 'number']]);
