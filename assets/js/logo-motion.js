/* Bristlecone logo motion: tonal stamp build, bottom up (about 2 s). Needs logo-data.js (window.LOGO).
   LogoMotion.mount(container, { word: "#fff", sub: "#2fc2e2", divider: "#2fc2e2", autoplay: true }) builds the logo and
   returns { replay, hide, prepare }; with autoplay it plays at once and replays on click.
   The tree builds on a canvas from one small pre-drawn bitmap per piece (hundreds of moving SVG shapes drop frames);
   at rest the SVG shows, so the final logo is the exact vector art. */
(function () {
  const D = window.LOGO, NS = "http://www.w3.org/2000/svg";
  const VBW = +D.viewBox.split(/\s+/)[2], ASPECT = VBW / +D.viewBox.split(/\s+/)[3];
  const STAMP = { dur: 380, at: [0, .45, .75, 1], scale: [.35, 1.1, .97, 1], alpha: [0, 1, 1, 1] };
  const FLASH = { delay: 1380, dur: 500 };

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function attrs(e, a) { a.replace(/([\w-]+)="([^"]*)"/g, (_, k, v) => e.setAttribute(k, v)); }
  function attr(a, k) { const m = a.match(new RegExp(`${k}="([^"]*)"`)); return m && m[1]; }
  function at(e, x, y) { e.style.transformBox = "view-box"; e.style.transformOrigin = `${x}px ${y}px`; }
  function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }
  function bezier(x1, y1, x2, y2) {  // CSS cubic-bezier timing function
    const f = (t, a, b) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
    return x => { let lo = 0, hi = 1, t = x; for (let i = 0; i < 20; i++) { t = (lo + hi) / 2; if (f(t, x1, x2) < x) lo = t; else hi = t; } return f(t, y1, y2); };
  }
  const easeOut = bezier(0, 0, .58, 1);
  function lerpKeys(keys, at, p) { for (let i = 1; i < at.length; i++) if (p <= at[i]) return keys[i - 1] + (keys[i] - keys[i - 1]) * (p - at[i - 1]) / (at[i] - at[i - 1]); return keys[keys.length - 1]; }

  // Pieces in paint order: every shape, plus each base layer cut into its cluster regions
  const TREECLIP = D.defs.match(/ d="([^"]+)"/)[1];
  const r = rng(11), PIECES = [];
  D.tree.forEach(s => {
    const base = { d: s.d, fill: attr(s.a, "fill"), rule: attr(s.a, "fill-rule") || "nonzero", tone: s.tone };
    if (s.role !== "outline") { PIECES.push({ ...base, bb: s.bb, own: s.c }); return; }
    D.clusters.forEach(c => {
      const bb = [Math.max(s.bb[0], c.cb[0]), Math.max(s.bb[1], c.cb[1]), Math.min(s.bb[2], c.cb[2]), Math.min(s.bb[3], c.cb[3])];
      if (bb[2] > bb[0] && bb[3] > bb[1]) PIECES.push({ ...base, clip: c.clip, bb, own: c.c });
    });
  });
  PIECES.forEach(p => { p.delay = 40 + (1 - p.own[1] / 687) * 950 + p.tone * 45 + r() * 50; });  // bottom up, dark first
  const TREE_END = Math.max(...PIECES.map(p => p.delay)) + STAMP.dur;

  function build(colors) {
    const svg = el("svg", { viewBox: D.viewBox, role: "img", "aria-label": "Bristlecone Private Wealth" });
    el("defs", {}, svg).innerHTML = D.defs.replace(/^<defs>|<\/defs>$/g, "").replace('id="treeclip"', 'id="lm-treeclip"');
    const tree = el("g", { "clip-path": "url(#lm-treeclip)" }, svg);
    tree.innerHTML = D.tree.map(s => `<path ${s.a} d="${s.d}"/>`).join("");
    const fill = { word: colors.word, private: colors.sub, wealth: colors.sub };
    const wordRest = el("g", {}, svg);
    wordRest.innerHTML = D.wordraw;
    [...wordRest.children].forEach((p, i) => fill[["word", "private", "wealth"][i]] && p.setAttribute("fill", fill[["word", "private", "wealth"][i]]));
    const word = el("g", { visibility: "hidden" }, svg);
    const letters = D.letters.map(l => {
      const p = el("path", { d: l.d }, word); attrs(p, l.a);
      if (fill[l.role]) p.setAttribute("fill", fill[l.role]);
      return { el: p, role: l.role };
    });
    svg.insertAdjacentHTML("beforeend", D.divider);
    const divider = svg.lastElementChild;
    if (colors.divider) divider.setAttribute("fill", colors.divider);
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;visibility:hidden";
    return { svg, tree, canvas, letters, divider, wordRest, word, anims: [], raf: 0 };
  }

  // One bitmap per piece at the current size, drawn in small batches so the page stays smooth
  function prepare(L) {
    const k = L.svg.getBoundingClientRect().width / VBW * Math.min(devicePixelRatio || 1, 2);
    if (!k) return Promise.resolve(false);
    if (L.k === k && L.ready) return L.ready;
    L.k = k;
    const job = L.job = {}, treeclip = new Path2D(TREECLIP), paths = new Map();
    const path = d => paths.get(d) || (paths.set(d, new Path2D(d)), paths.get(d));
    let i = 0;
    L.bmps = [];
    L.ready = new Promise(done => {
      (function batch() {
        if (L.job !== job) return done(false);
        const until = performance.now() + 8;
        while (i < PIECES.length && performance.now() < until) {
          const p = PIECES[i];  // bitmap on whole device pixels, so at rest it lands pixel-exact
          const X0 = Math.floor(p.bb[0] * k) - 2, Y0 = Math.floor(p.bb[1] * k) - 2;
          const c = document.createElement("canvas");
          c.width = Math.ceil(p.bb[2] * k) + 2 - X0; c.height = Math.ceil(p.bb[3] * k) + 2 - Y0;
          const g = c.getContext("2d");
          g.setTransform(k, 0, 0, k, -X0, -Y0);
          g.clip(treeclip, "evenodd");
          if (p.clip) g.clip(path(p.clip), "evenodd");
          g.fillStyle = p.fill;
          g.fill(path(p.d), p.rule);
          L.bmps[i++] = { c, X0, Y0 };
        }
        if (i < PIECES.length) setTimeout(batch, 0); else done(true);
      })();
    });
    return L.ready;
  }

  function drawFrame(L, t) {
    const g = L.ctx, k = L.k;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, L.canvas.width, L.canvas.height);
    for (let i = 0; i < PIECES.length; i++) {
      const p = PIECES[i], b = L.bmps[i], q = (t - p.delay) / STAMP.dur;
      if (q <= 0) continue;
      const e = q >= 1 ? 1 : easeOut(q), s = lerpKeys(STAMP.scale, STAMP.at, e), a = lerpKeys(STAMP.alpha, STAMP.at, e);
      if (a <= 0) continue;
      g.globalAlpha = a;
      g.setTransform(s, 0, 0, s, k * p.own[0] * (1 - s), k * p.own[1] * (1 - s));
      g.drawImage(b.c, b.X0, b.Y0);
    }
    g.globalAlpha = 1;
  }

  function wordmark(L) {
    const out = [], start = 1150;
    L.letters.filter(l => l.role === "word").forEach((l, i) => {
      at(l.el, 0, 0);
      out.push([l.el, [{ transform: "translateY(16px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
        { delay: start + i * 35, duration: 500, easing: "cubic-bezier(.2,.8,.2,1)" }]);
    });
    at(L.divider, 817, 717);
    out.push([L.divider, [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { delay: start + 120, duration: 420, easing: "cubic-bezier(.5,0,.2,1)" }]);
    L.letters.filter(l => l.role !== "word").forEach((l, i) => {
      at(l.el, 0, 0);
      const j = l.role === "private" ? i : i - 7;
      out.push([l.el, [{ transform: "translateX(14px)", opacity: 0 }, { transform: "translateX(0)", opacity: 1 }],
        { delay: start + 260 + j * 30 + (l.role === "wealth" ? 60 : 0), duration: 450, easing: "cubic-bezier(.2,.8,.2,1)" }]);
    });
    out.push([L.canvas, [{ filter: "brightness(1)" }, { filter: "brightness(1.45)", offset: .3 }, { filter: "brightness(1)" }],
      { delay: FLASH.delay, duration: FLASH.dur, easing: "ease-out" }]);
    return out;
  }

  function reset(L) {
    cancelAnimationFrame(L.raf);
    L.run = null;
    L.anims.forEach(a => a.cancel());
    L.anims = [];
    [...L.letters.map(l => l.el), L.divider].forEach(e => e.removeAttribute("style"));
    L.canvas.style.visibility = "hidden";
    L.tree.removeAttribute("visibility");
    L.wordRest.removeAttribute("visibility");
    L.word.setAttribute("visibility", "hidden");
  }

  async function play(L) {
    reset(L);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const run = L.run = {};
    L.tree.setAttribute("visibility", "hidden");  // nothing shows until the pieces are ready
    L.wordRest.setAttribute("visibility", "hidden");
    if (!(await prepare(L)) || L.run !== run) { if (L.run === run) reset(L); return; }
    const box = L.svg.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    L.canvas.width = Math.round(box.width * dpr);
    L.canvas.height = Math.round(box.width / ASPECT * dpr);
    L.ctx = L.ctx || L.canvas.getContext("2d");
    drawFrame(L, 0);
    L.canvas.style.visibility = "";
    L.word.removeAttribute("visibility");
    L.anims = wordmark(L).map(([e, kf, o]) => e.animate(kf, { ...o, fill: "backwards" }));
    const t0 = performance.now(), end = Math.max(TREE_END, FLASH.delay + FLASH.dur);
    let built = false;
    const tick = now => {
      if (L.run !== run) return;
      const t = now - t0;
      if (!built) { drawFrame(L, Math.min(t, TREE_END)); built = t >= TREE_END; }  // last draw is the finished tree
      if (t < end) L.raf = requestAnimationFrame(tick);
      else Promise.all(L.anims.map(a => a.finished)).then(() => { if (L.run === run) reset(L); }, () => {});
    };
    L.raf = requestAnimationFrame(tick);
  }

  window.LogoMotion = {
    mount(container, colors = {}) {
      const L = build(colors);
      container.appendChild(L.svg);
      container.appendChild(L.canvas);
      if (getComputedStyle(container).position === "static") container.style.position = "relative";
      const api = {
        replay: () => { L.svg.style.visibility = ""; play(L); },
        hide: () => { reset(L); L.svg.style.visibility = "hidden"; },
        prepare: () => prepare(L),
        still: async t => {  // for checking frames: the tree at t ms, no motion
          reset(L);
          L.tree.setAttribute("visibility", "hidden");
          await prepare(L);
          const box = L.svg.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
          L.canvas.width = Math.round(box.width * dpr); L.canvas.height = Math.round(box.width / ASPECT * dpr);
          L.ctx = L.ctx || L.canvas.getContext("2d");
          drawFrame(L, t);
          L.canvas.style.visibility = "";
        },
      };
      if (colors.autoplay !== false) { container.addEventListener("click", api.replay); api.replay(); }
      return api;
    },
  };
})();
