/* Bristlecone calculators: one page, one workspace.
   calc-defs.js registers every calculator on window.BPW_CALCS; this file renders the list, the form, the results,
   Start over and Download results (PDF). Results are hypothetical illustrations. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var DEFS = window.BPW_CALCS || {}, LIST = window.CALC_LIST || {}, META = window.CALC_META || {};
  var ORDER = ['Estate', 'Insurance', 'Investment', 'Lifestyle', 'Money', 'Retirement', 'Tax'];
  var nav = $('#calcnav'), box = $('#calcbox'), sel = $('#calcsel');
  var current = null, lastResult = null, ids = {};

  var slug = function (s) { return s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
  var commas = function (n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  function parse(s) { var x = parseFloat(String(s).replace(/[^0-9.\-]/g, '')); return isFinite(x) ? x : 0; }

  /* ---- build list (all calculators are live) ---- */
  function build() {
    var html = '', opts = '<option value="">Choose a calculator</option>';
    var tp = new URLSearchParams(location.search).get('topic'), only = ORDER.filter(function (c) { return c.toLowerCase() === tp; })[0];
    if (only) {
      var note = document.createElement('p'); note.className = 'tnote';
      note.innerHTML = 'Showing ' + only + ' calculators &middot; <a href="calculators.html' + location.hash + '">Show all</a>';
      nav.parentNode.insertBefore(note, nav);
    }
    (only ? [only] : ORDER).forEach(function (cat) {
      var items = LIST[cat] || []; if (!items.length) return;
      html += '<h3>' + cat + '</h3><ul>'; opts += '<optgroup label="' + cat + '">';
      items.forEach(function (name) {
        var id = slug(name); ids[id] = name;
        html += '<li><a href="#' + id + '" data-id="' + id + '">' + esc(name) + '</a></li>';
        opts += '<option value="' + id + '">' + esc(name) + '</option>';
        if (DEFS[name]) DEFS[name].cat = cat;
      });
      html += '</ul>'; opts += '</optgroup>';
    });
    nav.innerHTML = html; sel.innerHTML = opts;
  }

  /* ---- form ---- */
  function fieldHTML(f) {
    var id = 'f_' + f.k, h = '';
    if (f.s) h += '<h3 class="csec">' + esc(f.s) + '</h3>';
    var inner;
    if (f.t === 'sel') {
      inner = '<select id="' + id + '" data-k="' + f.k + '">' + f.o.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(f.v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    } else {
      var pre = f.t === 'cur' ? '<span class="pre">$</span>' : '', suf = f.t === 'pct' ? '<span class="suf">%</span>' : (f.u ? '<span class="suf">' + esc(f.u) + '</span>' : '');
      var shown = f.t === 'cur' ? commas(f.v, f.d || 0) : f.v;
      inner = '<div class="cin' + (pre ? ' haspre' : '') + (suf ? ' hassuf' : '') + '">' + pre + '<input id="' + id + '" data-k="' + f.k + '" data-t="' + (f.t || 'num') + '" type="text" inputmode="decimal" autocomplete="off" value="' + shown + '">' + suf + '</div>';
    }
    return h + '<div class="cf"><label for="' + id + '">' + esc(f.l) + '</label>' + inner + '</div>';
  }
  function readValues() {
    var v = {};
    current.fields.forEach(function (f) {
      var el = document.getElementById('f_' + f.k); if (!el) return;
      v[f.k] = f.t === 'sel' ? el.value : parse(el.value);
    });
    return v;
  }
  function show(id) {
    var name = ids[id], c = name && DEFS[name];
    if (!c) { box.innerHTML = '<div class="cintro"><p class="eyebrow">Calculators</p><h2>Choose a calculator</h2><hr class="rule"><p class="lede">Pick one from the list to see your numbers update as you type.</p></div>'; mark(''); current = null; return; }
    current = c; mark(id); sel.value = id;
    var intro = (META[name] && META[name].intro) || c.desc || '';
    box.innerHTML = '<p class="eyebrow">' + (c.cat || '') + '</p><h2>' + esc(c.title || name) + '</h2><hr class="rule"><p class="lede">' + esc(intro) + '</p>' +
      '<div class="cgrid"><div class="cfields" id="cform">' + c.fields.map(fieldHTML).join('') + '</div><div class="cres" aria-live="polite"><div id="cres"></div>' +
      '<div class="cbtns"><button type="button" class="btn ghost" id="cstart">Start over</button><button type="button" class="btn" id="cdl">Download results</button></div></div></div>' +
      '<p class="cnote">' + esc(disclosure(c, name)) + '</p>';
    calc();
  }
  function disclosure(c, name) {
    var d = (META[name] && META[name].disc) || '';
    return c.disc || d || 'This is a hypothetical example used for illustrative purposes only. Results are estimates based on the assumptions entered, are not guarantees, and are not tax, legal or investment advice. Actual results will vary.';
  }
  function calc() {
    if (!current) return;
    var r;
    try { r = current.run(readValues()); } catch (e) { r = { err: 'Please check your entries.' }; }
    lastResult = r;
    $('#cres').innerHTML = render(r);
    var nt = box.querySelector('.cnote'); if (nt) nt.textContent = (r && r.disc) || disclosure(current, ids[location.hash.slice(1)] || current.title);
  }
  function mark(id) { nav.querySelectorAll('a').forEach(function (a) { a.classList.toggle('on', a.dataset.id === id); }); }
  function route() { show((location.hash || '').slice(1)); }

  /* ---- results ---- */
  function render(r) {
    if (r.err) return '<div class="cerr" role="alert">' + esc(r.err) + '</div>';
    var out = '<div class="cstats">';
    (r.stats || []).forEach(function (s) {
      if (s[0] === '#') out += '<h3 class="rh">' + esc(s[1]) + '</h3>';
      else if (s[0] === 'p') out += '<p class="rp">' + esc(s[1]) + '</p>';
      else out += '<div class="cs' + (s[2] ? ' big' : '') + '"><span>' + esc(s[0]) + '</span><b>' + esc(s[1]) + '</b></div>';
    });
    out += '</div>';
    if (r.chart) out += chart(r.chart);
    if (r.table) out += table(r.table);
    return out;
  }
  var COLORS = ['#0A2353', '#C9973A', '#1D7FBB', '#5E6873'];
  function chart(c) {
    if (c.bars) return bars(c.bars);
    var W = 640, H = 250, L = 12, R = 12, T = 14, B = 40, max = 0, min = 0;
    c.series.forEach(function (s) { s.d.forEach(function (x) { if (x > max) max = x; if (x < min) min = x; }); });
    if (max <= 0 && min >= 0) return '';
    var span = max - min, n = c.series[0].d.length - 1 || 1;
    var X = function (k) { return L + (W - L - R) * k / n; }, Y = function (y) { return T + (H - T - B) * (1 - (y - min) / span); };
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(c.title || 'Projection chart') + '" class="cchart">';
    o += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" stroke="#cfc9bd"/>';
    c.series.forEach(function (s, k) {
      var pts = s.d.map(function (y, x) { return X(x).toFixed(1) + ',' + Y(y).toFixed(1); }).join(' ');
      if (k === 0) o += '<polygon points="' + X(0) + ',' + Y(0) + ' ' + pts + ' ' + X(n) + ',' + Y(0) + '" fill="#0A2353" fill-opacity=".08"/>';
      o += '<polyline points="' + pts + '" fill="none" stroke="' + COLORS[k % 4] + '" stroke-width="3.2" stroke-linejoin="round"/>';
    });
    var xl = c.x || ['Now', 'Year ' + n];
    o += '<text x="' + L + '" y="' + (H - 10) + '" font-size="22" fill="#5E6873">' + esc(xl[0]) + '</text><text x="' + (W - R) + '" y="' + (H - 10) + '" font-size="22" fill="#5E6873" text-anchor="end">' + esc(xl[1]) + '</text></svg>';
    var key = c.series.length > 1 ? '<p class="ckey">' + c.series.map(function (s, k) { return '<span><i style="background:' + COLORS[k % 4] + '"></i>' + esc(s.n) + '</span>'; }).join('') + '</p>' : '<p class="ckey"><span>' + esc(c.title || c.series[0].n) + '</span></p>';
    return o + key;
  }
  function bars(items) {
    var max = 0; items.forEach(function (i) { if (i.v > max) max = i.v; });
    if (!max) return '';
    return '<div class="cbars">' + items.map(function (i, k) {
      return '<div class="cb"><span class="cbl">' + esc(i.n) + '</span><span class="cbt"><i style="width:' + Math.max(2, i.v / max * 100).toFixed(1) + '%;background:' + COLORS[(i.c != null ? i.c : k) % 4] + '"></i></span><span class="cbv">' + esc(i.t) + '</span></div>';
    }).join('') + '</div>';
  }
  function table(t) {
    var open = t.rows.length <= 12 ? ' open' : '';
    return '<details class="ctable"' + open + '><summary>' + esc(t.title || 'Year-by-year breakdown') + '</summary><div class="ctw"><table><thead><tr>' + t.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      t.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></details>';
  }

  /* ---- Start over + Download results ---- */
  function startOver() {
    if (!current) return;
    current.fields.forEach(function (f) {
      var el = document.getElementById('f_' + f.k); if (!el) return;
      el.value = f.t === 'sel' ? f.v : (f.t === 'cur' ? commas(f.v, f.d || 0) : f.v);
    });
    calc();
    var first = box.querySelector('input,select'); if (first) first.focus();
  }
  function fieldText(f, v) {
    if (f.t === 'sel') { var o = f.o.filter(function (x) { return String(x[0]) === String(v[f.k]); })[0]; return o ? o[1] : v[f.k]; }
    if (f.t === 'cur') return '$' + commas(v[f.k], f.d || 0);
    if (f.t === 'pct') return v[f.k] + '%';
    return v[f.k] + (f.u ? ' ' + f.u : '');
  }
  function loadPdf(cb) {
    if (window.jspdf) return cb(true);
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = function () { cb(!!window.jspdf); }; s.onerror = function () { cb(false); };
    document.head.appendChild(s);
  }
  function download() {
    if (!current || !lastResult || lastResult.err) return;
    var c = current, v = readValues(), r = lastResult, name = ids[location.hash.slice(1)] || c.title;
    loadPdf(function (ok) {
      if (!ok) { window.print(); return; }
      var doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'letter' }), W = 612, M = 54, y = 60;
      function page() { doc.addPage(); y = 60; }
      function need(h) { if (y + h > 740) page(); }
      function text(s, x, size, style, color, maxW) {
        doc.setFont('times', style || 'normal'); doc.setFontSize(size); doc.setTextColor.apply(doc, color || [10, 35, 83]);
        var lines = doc.splitTextToSize(String(s), maxW || (W - 2 * M)); need(lines.length * (size + 3));
        doc.text(lines, x, y); y += lines.length * (size + 3); return lines.length;
      }
      doc.setFont('times', 'normal'); doc.setFontSize(11); doc.setTextColor(10, 35, 83);
      doc.setFont('times', 'bold'); doc.setFontSize(13); doc.text('BRISTLECONE PRIVATE WEALTH', M, y); y += 8;
      doc.setDrawColor(201, 151, 58); doc.setLineWidth(1.5); doc.line(M, y, M + 56, y); y += 26;
      text(c.title || name, M, 22, 'bold');
      text('Prepared ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), M, 10, 'normal', [94, 104, 115]); y += 14;
      text('Your information', M, 14, 'bold'); y += 2;
      c.fields.forEach(function (f) {
        if (f.s) { y += 4; text(f.s, M, 11, 'bold', [26, 97, 161]); }
        need(16); doc.setFont('times', 'normal'); doc.setFontSize(11); doc.setTextColor(60, 70, 85);
        doc.text(f.l, M, y); doc.setFont('times', 'bold'); doc.setTextColor(10, 35, 83); doc.text(String(fieldText(f, v)), W - M, y, { align: 'right' }); y += 16;
      });
      y += 10; text('Results', M, 14, 'bold'); y += 2;
      (r.stats || []).forEach(function (s) {
        if (s[0] === '#') { y += 4; text(s[1], M, 11, 'bold', [26, 97, 161]); }
        else if (s[0] === 'p') { text(s[1], M, 10, 'italic', [94, 104, 115]); }
        else { need(18); doc.setFont('times', s[2] ? 'bold' : 'normal'); doc.setFontSize(s[2] ? 12 : 11); doc.setTextColor(60, 70, 85); doc.text(s[0], M, y); doc.setFont('times', 'bold'); doc.setTextColor(10, 35, 83); doc.text(String(s[1]), W - M, y, { align: 'right' }); y += s[2] ? 20 : 16; }
      });
      if (r.table) {
        y += 12; text(r.table.title || 'Year-by-year breakdown', M, 13, 'bold'); y += 4;
        var cw = (W - 2 * M) / r.table.cols.length;
        function head() { need(20); doc.setFont('times', 'bold'); doc.setFontSize(10); doc.setTextColor(10, 35, 83); r.table.cols.forEach(function (cn, i) { doc.text(cn, i === 0 ? M : M + cw * (i + 1) - 4, y, { align: i === 0 ? 'left' : 'right' }); }); y += 4; doc.setDrawColor(207, 201, 189); doc.line(M, y, W - M, y); y += 12; }
        head();
        r.table.rows.forEach(function (row) {
          if (y > 730) { page(); head(); }
          doc.setFont('times', 'normal'); doc.setFontSize(10); doc.setTextColor(60, 70, 85);
          row.forEach(function (cell, i) { doc.text(String(cell), i === 0 ? M : M + cw * (i + 1) - 4, y, { align: i === 0 ? 'left' : 'right' }); }); y += 14;
        });
      }
      y += 16; text((r && r.disc) || disclosure(c, name), M, 9, 'italic', [94, 104, 115]);
      text('Securities and advisory services offered through Prospera Financial Services, Inc. Member FINRA/SIPC.', M, 9, 'normal', [94, 104, 115]);
      window.BPW_PDF_LAST = doc; doc.save(slug(name) + '-results.pdf');
    });
  }

  /* ---- wire up ---- */
  build();
  box.addEventListener('input', function (e) { if (e.target.dataset && e.target.dataset.k) calc(); });
  box.addEventListener('change', function (e) { if (e.target.dataset && e.target.dataset.k) calc(); });
  box.addEventListener('blur', function (e) {
    var el = e.target; if (!el.dataset || el.dataset.t !== 'cur') return;
    var f = current && current.fields.filter(function (x) { return 'f_' + x.k === el.id; })[0]; el.value = commas(parse(el.value), f && f.d || 0);
  }, true);
  box.addEventListener('click', function (e) { if (e.target.id === 'cstart') startOver(); if (e.target.id === 'cdl') download(); });
  sel.addEventListener('change', function () { if (sel.value) location.hash = sel.value; });
  window.addEventListener('hashchange', route);
  if (!location.hash) { var f1 = nav.querySelector('a'); location.hash = f1 ? f1.dataset.id : slug(Object.keys(DEFS)[0] || ''); } else route();
  window.BPW_CALC_TEST = { ids: ids, show: show, run: function (name) { var c = DEFS[name]; var v = {}; c.fields.forEach(function (f) { v[f.k] = f.v; }); return c.run(v); }, defs: DEFS };
})();
