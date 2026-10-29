/* Bristlecone articles: one page, one reader. articles-data.js sets window.ARTICLES (cat, slug, title, read, body).
   The list filters by topic and search; the chosen article opens beside it and the address hash keeps its link. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var A = window.ARTICLES || [], ORDER = ['retirement', 'investment', 'estate', 'insurance', 'tax', 'money', 'lifestyle'];
  var NAMES = { retirement: 'Retirement', investment: 'Investment', estate: 'Estate', insurance: 'Insurance', tax: 'Tax', money: 'Money', lifestyle: 'Lifestyle' };
  var nav = $('#anav'), box = $('#abox'), sel = $('#asel'), q = $('#asearch'), chips = $('#achips'), count = $('#acount');
  var topic = 'all', cur = null, text = {};
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
  A.sort(function (a, b) { return ORDER.indexOf(a.cat) - ORDER.indexOf(b.cat); });
  A.forEach(function (a) { text[a.slug] = (a.title + ' ' + a.body.replace(/<[^>]+>/g, ' ')).toLowerCase(); });

  function visible() {
    var v = q.value.trim().toLowerCase();
    return A.filter(function (a) { return (topic === 'all' || a.cat === topic) && (!v || text[a.slug].indexOf(v) > -1); });
  }
  function chipsHTML() {
    var h = '<button type="button" data-t="all"' + (topic === 'all' ? ' class="on"' : '') + '>All <span>' + A.length + '</span></button>';
    ORDER.forEach(function (c) {
      var n = A.filter(function (a) { return a.cat === c; }).length;
      h += '<button type="button" data-t="' + c + '"' + (topic === c ? ' class="on"' : '') + '>' + NAMES[c] + ' <span>' + n + '</span></button>';
    });
    chips.innerHTML = h;
  }
  function render() {
    var list = visible(), h = '', o = '<option value="">Choose an article</option>', last = '';
    list.forEach(function (a) {
      if (a.cat !== last) {
        if (last) { h += '</ul>'; o += '</optgroup>'; }
        h += '<h3>' + NAMES[a.cat] + '</h3><ul>'; o += '<optgroup label="' + NAMES[a.cat] + '">'; last = a.cat;
      }
      h += '<li><a href="#' + a.slug + '" data-s="' + a.slug + '"' + (cur && cur.slug === a.slug ? ' class="on"' : '') + '>' + esc(a.title) + '</a></li>';
      o += '<option value="' + a.slug + '"' + (cur && cur.slug === a.slug ? ' selected' : '') + '>' + esc(a.title) + '</option>';
    });
    if (last) { h += '</ul>'; o += '</optgroup>'; }
    nav.innerHTML = h || '<p class="anone">No articles match your search.</p>'; sel.innerHTML = o;
    count.textContent = list.length + (list.length === 1 ? ' article' : ' articles');
    chipsHTML();
  }
  function show(slug, scroll) {
    var a = A.filter(function (x) { return x.slug === slug; })[0] || visible()[0] || A[0];
    if (!a) return;
    cur = a;
    var same = A.filter(function (x) { return x.cat === a.cat; }), i = same.indexOf(a), nx = same[(i + 1) % same.length];
    box.innerHTML = '<p class="eyebrow">' + NAMES[a.cat] + (a.read ? ' &middot; ' + esc(a.read) + ' read' : '') + '</p><h2>' + esc(a.title) + '</h2><hr class="rule"><div class="abody">' + a.body + '</div>' +
      '<div class="anext"><a class="more" href="#' + nx.slug + '">Next in ' + NAMES[a.cat] + ': ' + esc(nx.title) + '</a></div>';
    document.title = a.title + ' | Bristlecone Private Wealth';
    [].forEach.call(nav.querySelectorAll('a'), function (l) { l.classList.toggle('on', l.getAttribute('data-s') === a.slug); });
    sel.value = a.slug;
    if (scroll) box.scrollIntoView({ block: 'start' });
  }
  function fromHash() { show(location.hash.slice(1), false); }

  q.addEventListener('input', function () { render(); });
  chips.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; topic = b.getAttribute('data-t'); render(); });
  sel.addEventListener('change', function () { if (sel.value) { history.pushState(null, '', '#' + sel.value); show(sel.value, false); } });
  /* Switch articles in place: no anchor jump or smooth scroll. The sidebar keeps the page where it is; "Next" (at the article's end) returns to its top. */
  function go(e) {
    var l = e.target.closest('a[href^="#"]'); if (!l) return;
    e.preventDefault(); history.pushState(null, '', l.getAttribute('href'));
    show(l.getAttribute('href').slice(1), false);
    if (box.contains(l)) window.scrollTo({ top: box.getBoundingClientRect().top + window.pageYOffset - 150, behavior: 'instant' });
  }
  nav.addEventListener('click', go); box.addEventListener('click', go);
  window.addEventListener('popstate', fromHash);
  var t0 = new URLSearchParams(location.search).get('topic'); if (t0 && NAMES[t0]) topic = t0;
  var h0 = location.hash.slice(1), first = A.filter(function (x) { return x.slug === h0; })[0];
  if (first && topic !== 'all' && first.cat !== topic) topic = 'all';
  render(); show(h0, false);
})();
