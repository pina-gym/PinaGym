<?php
require __DIR__ . '/bootstrap.php';
require_perm('product.view');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!can('product.manage')) forbidden(); // kasir hanya boleh melihat, tidak bisa ubah harga
    $a = $_POST['action'] ?? '';
    if ($a === 'add') {
        q('INSERT INTO products(name,price,cost,stock) VALUES(?,?,?,?)', [trim((string)$_POST['name']), max(0, (int)$_POST['price']), max(0, (int)$_POST['cost']), max(0, (int)$_POST['stock'])]);
        log_act('produk_tambah', trim((string)$_POST['name']));
    } elseif ($a === 'update') {
        q('UPDATE products SET price=?, cost=?, stock=? WHERE id=?', [max(0, (int)$_POST['price']), max(0, (int)$_POST['cost']), max(0, (int)$_POST['stock']), (int)$_POST['id']]);
        log_act('produk_ubah', 'id ' . (int)$_POST['id'] . ' harga ' . (int)$_POST['price']);
    }
    flash('Produk disimpan.'); redirect('products.php');
}
$manage = can('product.manage'); $cost = can('product.cost');
render_header('Produk & Stok', 'products');
if (!$manage) echo '<p class="muted">Mode hanya-lihat.</p>';
echo '<div class="card"><table><tr><th>Produk</th><th class="r">Harga</th>' . ($cost ? '<th class="r">Modal</th>' : '') . '<th class="r">Stok</th>' . ($manage ? '<th></th>' : '') . '</tr>';
foreach (rows('SELECT * FROM products WHERE active=1 ORDER BY name') as $p) {
    if ($manage) {
        echo '<tr><form method="post">' . csrf_field() . '<input type="hidden" name="action" value="update"><input type="hidden" name="id" value="' . $p['id'] . '"><td>' . h($p['name']) . '</td>'
            . '<td><input name="price" type="number" value="' . $p['price'] . '" style="width:110px"></td>' . ($cost ? '<td><input name="cost" type="number" value="' . $p['cost'] . '" style="width:110px"></td>' : '<input type="hidden" name="cost" value="' . $p['cost'] . '">')
            . '<td><input name="stock" type="number" value="' . $p['stock'] . '" style="width:90px"></td><td><button class="btn sm">Simpan</button></td></form></tr>';
    } else {
        echo '<tr><td>' . h($p['name']) . '</td><td class="r">' . rp($p['price']) . '</td>' . ($cost ? '<td class="r">' . rp($p['cost']) . '</td>' : '') . '<td class="r">' . $p['stock'] . '</td></tr>';
    }
}
echo '</table></div>';
if ($manage) echo '<form method="post" class="card form wide">' . csrf_field() . '<input type="hidden" name="action" value="add"><label>Nama<input name="name" required></label><label>Harga jual<input name="price" type="number" required></label><label>Harga modal<input name="cost" type="number" value="0"></label><label>Stok<input name="stock" type="number" value="0"></label><button class="btn">Tambah Produk</button></form>';
render_footer();
