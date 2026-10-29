/* Video player modal (Wistia embeds) and the All Videos filter. */
(function () {
  'use strict';
  var modal = document.getElementById('vmodal'); if (!modal) return;
  var frame = modal.querySelector('.vframe'), title = modal.querySelector('.vtitle'), last = null;
  function open(id, t, from) {
    last = from; title.textContent = t || '';
    frame.innerHTML = '<iframe src="https://fast.wistia.com/embed/iframe/' + id + '?autoPlay=true&videoFoam=true" title="' + (t || 'Video').replace(/"/g, '') + '" allow="autoplay; fullscreen" allowfullscreen></iframe>';
    modal.hidden = false; document.body.style.overflow = 'hidden'; modal.querySelector('.vclose').focus();
  }
  function close() { modal.hidden = true; frame.innerHTML = ''; document.body.style.overflow = ''; if (last) last.focus(); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-wistia]');
    if (b) { open(b.dataset.wistia, b.dataset.title, b); return; }
    if (e.target === modal || e.target.closest('.vclose')) close();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });

  var q = document.getElementById('vsearch'); if (!q) return;
  var cards = [].slice.call(document.querySelectorAll('.vall .vcard')), chips = [].slice.call(document.querySelectorAll('.chip')), none = document.querySelector('.anone'), f = 'all';
  function apply() {
    var v = q.value.trim().toLowerCase(), n = 0;
    cards.forEach(function (c) {
      var m = (f === 'all' || c.dataset.cat === f) && (!v || c.textContent.toLowerCase().indexOf(v) > -1);
      c.hidden = !m; if (m) n++;
    });
    none.hidden = n > 0;
  }
  var h = location.hash.slice(1), hc = chips.filter(function (c) { return c.dataset.f === h; })[0]; if (hc) { f = h; chips.forEach(function (x) { x.classList.toggle('on', x === hc); }); apply(); }
  q.addEventListener('input', apply);
  chips.forEach(function (c) { c.addEventListener('click', function () { f = c.dataset.f; chips.forEach(function (x) { x.classList.toggle('on', x === c); }); apply(); }); });
})();
