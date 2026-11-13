(function () {
  var side = document.getElementById('side'), scrim = document.getElementById('scrim');
  function toggle(open) {
    if (!side) return;
    side.classList.toggle('open', open);
    scrim.classList.toggle('show', open);
  }
  ['burger', 'moreBtn'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function (e) { e.preventDefault(); toggle(!side.classList.contains('open')); });
  });
  if (scrim) scrim.addEventListener('click', function () { toggle(false); });

  // konfirmasi untuk aksi berbahaya
  document.addEventListener('submit', function (e) {
    var m = e.target.getAttribute('data-confirm');
    if (m && !confirm(m)) e.preventDefault();
  });

  // total POS / pembayaran
  var qs = document.querySelectorAll('input.qty[data-price]');
  var out = document.getElementById('posTotal');
  function rp(n) { return 'Rp ' + n.toLocaleString('id-ID'); }
  function calc() {
    var t = 0;
    qs.forEach(function (i) { t += (parseInt(i.value, 10) || 0) * parseInt(i.getAttribute('data-price'), 10); });
    if (out) out.textContent = rp(t);
  }
  qs.forEach(function (i) { i.addEventListener('input', calc); });
  calc();
})();
