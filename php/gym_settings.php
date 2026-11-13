<?php
require __DIR__ . '/bootstrap.php';
settings_page('Pengaturan Gym', 'gym', 'gym.settings', ['gym_name' => ['Nama gym', 'text'], 'gym_address' => ['Alamat', 'text'], 'gym_phone' => ['Telepon', 'text']]);
