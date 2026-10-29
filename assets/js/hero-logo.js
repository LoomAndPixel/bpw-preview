/* Home hero: the bull video plays, then the animated logo pops out on the right (needs logo-data.js + logo-motion.js). */
(function () {
  var hero = document.querySelector(".hero"), video = hero && hero.querySelector(".bull"), box = hero && hero.querySelector(".logo-motion");
  if (!box) return;
  var logo = LogoMotion.mount(box, { word: "#ffffff", sub: "#2fc2e2", divider: "#2fc2e2", autoplay: false });
  var SIZE = .7;  // logo height as a share of the hero height
  // The bull starts fading at FADE (1 s, style.css) and the tree starts building at HANDOFF, so they overlap. The video
  // dissolves into its own logo from about 4.35 s, so the bull must be gone by then. ?handoff= to try other tree start times
  var FADE = 3.3, HANDOFF = +(new URLSearchParams(location.search).get("handoff") || 3.5), ASPECT = 1054.87 / 835.04, started = false;

  function place() {  // centred in the hero rings (73.75% across, as in style.css), clear of the text
    var h = hero.getBoundingClientRect(), right = 0, r = document.createRange();
    hero.querySelectorAll(".wrap > *").forEach(function (e) { r.selectNodeContents(e); right = Math.max(right, r.getBoundingClientRect().right - h.left); });
    var w = h.height * SIZE * ASPECT, left;
    if (innerWidth > 820) {
      var from = right + 32, to = h.width - 20;
      w = Math.min(w, to - from);
      left = Math.min(Math.max(h.width * .7375 - w / 2, from), to - w);
    } else {  // phones: the logo sits below the text in the page flow (style.css)
      box.style.width = box.style.left = box.style.top = "";
      return;
    }
    box.style.width = w + "px";
    box.style.left = left + "px";
    box.style.top = (h.height - w / ASPECT) / 2 + "px";
  }
  function handoff() {
    if (started) return;
    started = true;
    if (video) video.classList.add("out");
    logo.replay();
  }
  function watch() {
    if (started) return;
    if (video.currentTime >= FADE) video.classList.add("out");
    if (video.currentTime >= HANDOFF || video.ended) handoff(); else requestAnimationFrame(watch);
  }
  function start() {
    started = false;
    logo.hide();
    if (!video || getComputedStyle(video).display === "none") return handoff();  // reduced motion hides the video
    video.classList.remove("out");
    video.currentTime = 0;
    var p = video.play();
    if (p && p.catch) p.catch(handoff);  // autoplay blocked: just build the logo
    requestAnimationFrame(watch);
  }
  if (video) video.addEventListener("error", handoff);
  box.addEventListener("click", start);
  addEventListener("resize", place);
  if (document.fonts) document.fonts.ready.then(function () { place(); logo.prepare(); });
  place();
  logo.prepare();  // pre-draw the tree pieces while the bull plays
  start();
})();
