/* Site motion: content fades up as it scrolls into view, gold rules draw in, the Vista steps get a gold line,
   "Since 1998" counts up, and the header tightens once the page scrolls. Off for prefers-reduced-motion. */
(function () {
  var header = document.querySelector(".header");
  if (header) {  // header: tighten after scrolling (hysteresis so the height change can't flicker at the edge)
    var tight = false;
    var onScroll = function () {
      var y = window.scrollY;
      if (!tight && y > 90) { tight = true; header.classList.add("scrolled"); }
      else if (tight && y < 20) { tight = false; header.classList.remove("scrolled"); }
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;

  var SEL = [
    ".hero .wrap > *", ".page-head .wrap > *",
    "main section .wrap > .eyebrow", "main section .wrap > h2", "main section .wrap > .rule", "main section .wrap > .lede", "main section .wrap > p",
    "main .center > *", "main .split > div > *", "main .split > .graphic", "main .split > img",
    "main .cards > *", "main .team > *", "main .vista > div", "main .vs > div > *", "main .vslice"
  ].join(",");
  var items = [].slice.call(document.querySelectorAll(SEL));
  var seen = new Set();
  items.forEach(function (el) {
    if (seen.has(el)) return;
    seen.add(el);
    var sibs = [].filter.call(el.parentNode.children, function (s) { return s.matches(SEL); });
    el.style.setProperty("--rvd", Math.min(sibs.indexOf(el), 6) * 90 + "ms");  // tiles in a row arrive one by one
    el.classList.add("rv");
  });

  function done(el) {  // after it lands, drop the reveal transition so hovers respond without the stagger delay ("in" stays: shown)
    el.addEventListener("transitionend", function end(e) {
      if (e.target !== el) return;
      el.removeEventListener("transitionend", end);
      el.classList.remove("rv");
      el.style.removeProperty("--rvd");
    });
  }

  function count(b) {  // "Since 1998": counts back from this year to the year, after the tile has faded in
    var m = b.textContent.match(/^(.*?)(\d{4})$/);
    if (!m) return;
    var to = +m[2], from = new Date().getFullYear(), delay = 700, dur = 2600;
    b.style.fontVariantNumeric = "tabular-nums";
    b.textContent = m[1] + from;
    setTimeout(function () {
      var t0 = performance.now();
      (function step(now) {
        var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 2);
        b.textContent = m[1] + Math.round(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(step); else b.style.fontVariantNumeric = "";
      })(t0);
    }, delay);
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      io.unobserve(el);
      if (el.classList.contains("vista")) { el.classList.add("in"); return; }
      if (el.matches(".graphic")) { var b = el.querySelector("b"); if (b) count(b); }
      done(el);
      el.classList.add("in");
    });
  }, { rootMargin: "0px 0px -8% 0px" });

  items.forEach(function (el) { io.observe(el); });
  document.querySelectorAll("main .vista").forEach(function (v) { io.observe(v); });
})();
