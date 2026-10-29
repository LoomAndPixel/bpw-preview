/* Topic page tabs (Videos / Articles / Calculators): one panel shows at a time. */
(function () {
  'use strict';
  var tabs = [].slice.call(document.querySelectorAll('.ttab')), panels = [].slice.call(document.querySelectorAll('.tpanel'));
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) { var on = x === t; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
      panels.forEach(function (p) { p.hidden = p.dataset.t !== t.dataset.t; });
    });
  });
})();

/* Featured video: a random one from this topic on every load. */
(function () {
  var pool = window.FEAT_POOL, b = document.querySelector('.vfeat.vbtn');
  if (!pool || !pool.length || !b) return;
  var v = pool[Math.floor(Math.random() * pool.length)];
  b.dataset.wistia = v.w; b.dataset.title = v.t;
  b.querySelector('img').src = 'assets/img/video-thumbs/' + v.i;
  b.querySelector('.h2').textContent = v.t;
  b.querySelector('.p').textContent = v.d;
})();
