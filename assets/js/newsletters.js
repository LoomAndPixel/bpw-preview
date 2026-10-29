/* Bristlecone newsletters: issue list beside a page-by-page reader. window.ISSUES = [{slug, label, pages}].
   Arrow keys and the buttons turn pages; the address hash (#slug) keeps an issue's link. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var I = window.ISSUES || [], list = $('#ilist'), box = $('#ibox'), cur = null, pg = 1;
  var img = function (s, n, k) { return 'assets/img/newsletters/' + s + '/' + k + (n < 10 ? '0' : '') + n + '.jpg'; };

  function renderList() {
    list.innerHTML = I.map(function (a) {
      return '<a href="#' + a.slug + '" data-s="' + a.slug + '"' + (cur && cur.slug === a.slug ? ' class="on"' : '') + '><img src="assets/img/newsletters/' + a.slug + '/cover.jpg" alt="" loading="lazy"><span>' + a.label + '<small>' + a.pages + ' pages</small></span></a>';
    }).join('');
  }
  function page(n) {
    pg = Math.max(1, Math.min(cur.pages, n));
    var p = $('#ipage'); p.src = img(cur.slug, pg, 'p'); p.alt = cur.label + ', page ' + pg;
    $('#icount').textContent = 'Page ' + pg + ' of ' + cur.pages;
    $('#iprev').disabled = pg === 1; $('#inext').disabled = pg === cur.pages;
    [].forEach.call(document.querySelectorAll('#istrip button'), function (b) { b.classList.toggle('on', +b.getAttribute('data-n') === pg); });
    var on = $('#istrip button.on'), st = $('#istrip'); if (on) st.scrollLeft = on.offsetLeft - (st.clientWidth - on.offsetWidth) / 2;
    if (pg < cur.pages) (new Image()).src = img(cur.slug, pg + 1, 'p');
  }
  function show(slug) {
    cur = I.filter(function (a) { return a.slug === slug; })[0] || I[0]; if (!cur) return;
    var th = '';
    for (var n = 1; n <= cur.pages; n++) th += '<button type="button" data-n="' + n + '" aria-label="Page ' + n + '"><img src="' + img(cur.slug, n, 't') + '" alt="" loading="lazy"></button>';
    box.innerHTML = '<div class="ihead"><h2>' + cur.label + '</h2><div class="itools"><span id="icount"></span>' + (document.fullscreenEnabled ? '<button type="button" class="btn ghost" id="ifull">Full screen</button>' : '') + '<a class="btn" href="assets/newsletters/' + cur.slug + '.pdf" download>Download PDF</a></div></div>' +
      '<div class="iview" id="iview"><button type="button" class="iarrow l" id="iprev" aria-label="Previous page">&#8249;</button><img id="ipage" alt="" title="Click to view full screen"><button type="button" class="iarrow r" id="inext" aria-label="Next page">&#8250;</button></div>' +
      '<div class="istrip" id="istrip">' + th + '</div>';
    document.title = 'Vista Unplugged, ' + cur.label + ' | Bristlecone Private Wealth';
    renderList(); page(1);
  }
  function go(e) {
    var l = e.target.closest('a[data-s]'); if (!l) return;
    e.preventDefault(); history.pushState(null, '', '#' + l.getAttribute('data-s')); show(l.getAttribute('data-s'));
  }
  list.addEventListener('click', go);
  box.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.id === 'iprev') page(pg - 1); else if (t.id === 'inext') page(pg + 1); else if (t.id === 'ifull') full(); else if (t.hasAttribute('data-n')) page(+t.getAttribute('data-n'));
  });
  box.addEventListener('click', function (e) { if (e.target.id === 'ipage' && document.fullscreenEnabled) full(); });
  function full() {
    var v = $('#iview'); if (!v) return;
    if (document.fullscreenElement) document.exitFullscreen(); else v.requestFullscreen();
  }
  document.addEventListener('keydown', function (e) {
    if (!cur || /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') page(pg + 1); else if (e.key === 'ArrowLeft') page(pg - 1);
  });
  window.addEventListener('popstate', function () { show(location.hash.slice(1)); });
  show(location.hash.slice(1));
})();
