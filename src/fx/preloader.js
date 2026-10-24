/**
 * INTRO — "activación de la forja". Directs the first visit on the hero's own canvas:
 *
 *   00  0 ms       #loader is already coal‑black at first paint (render‑blocking CSS)
 *   01  0–0.9 s    a brushed‑steel plate in the dark; one incandescent point; dust in its light
 *   02  0.9–2.4 s  the point opens into a molten crack along the real outline of the mark
 *   03  2.4–3.6 s  hammer blow (ring of light, 2 px shake, flash, sparks); the mark solidifies,
 *                  a specular band runs over it once; ARDENTIUM rises as cold iron, the h1 rises
 *   04  3.6–4.7 s  a heat front burns the plate away onto the hero; the mark flies into the nav
 *
 * The scene is a pure function of time (so the dev tool can seek it). Every intro piece ends in
 * its real counterpart: the wordmark is the hero's own texture in its own box, the h1 is the real
 * h1, and the mark lands on .brand__a. Repeat visits get a ≤ 1 s version; skipping goes straight
 * to the reveal in 400 ms. Resolves — like before — when the hero starts to show; the value lets
 * main.js run the heat‑mask reveal (sweep) and the pour in sync with the shader.
 */
import { state, onTick, clamp, easeInOut } from "./ticker.js";
import { IntroGL } from "./intro-gl.js";

const KEY = "ard-intro";
const T = { core: 0.9, impact: 2.4, handoff: 3.0, flip: [3.0, 0.9], h1: [3.25, 0.62], sweep: 3.6 };
const SWEEP = { full: 1.1, short: 0.7, skip: 0.34 };  // the skip leaves room for the last frame inside 400 ms
const SHORT_AT = 0.3, POUR = 1.7, DEADLINE = 6000;
const EASE_OUT = "cubic-bezier(.16, 1, .3, 1)";      // --ease-out
const EASE_INOUT = "cubic-bezier(.65, 0, .35, 1)";   // --ease-inout
const EASE_LIFT = "cubic-bezier(.3, .7, .4, 1)";     // the mark lifting off the plate: early, but unhurried
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const seg = (t, a, b) => clamp((t - a) / (b - a));
const MASK = typeof CSS !== "undefined" && (CSS.supports("mask-image", "linear-gradient(#000,#000)") || CSS.supports("-webkit-mask-image", "linear-gradient(#000,#000)"));

/** Reveal API for when there is no intro at all (reduced motion, no loader). */
const instant = { sweep() {}, pour(forge) { if (forge) forge.ignite = 1; }, mode: "none" };

export function runPreloader({ forge, sparks } = {}) {
  const loader = document.getElementById("loader");
  const html = document.documentElement;
  const skipBtn = document.getElementById("introSkip");
  const sr = document.getElementById("introSr");
  const hideChrome = () => { if (skipBtn) skipBtn.hidden = true; if (sr) sr.hidden = true; };
  if (!loader || state.reduced || !html.classList.contains("is-loading")) {
    if (forge) { forge.compile(); if (!forge.textReady) forge.drawText(); }
    html.classList.remove("is-loading");
    if (loader) loader.hidden = true;
    hideChrome();
    return Promise.resolve(instant);
  }

  const q = location.search;
  // en DEV siempre la intro completa (para probarla); en prod, ?intro la fuerza
  const forced = import.meta.env.DEV || /[?&]intro\b/.test(q);
  const hold = import.meta.env.DEV && /[?&]hold\b/.test(q);
  let seen = false;
  try { seen = localStorage.getItem(KEY) === "1"; localStorage.setItem(KEY, "1"); } catch (_) { /* storage blocked */ }
  // a deep link (#contacto…) wants the content, not the show
  const deep = location.hash && location.hash !== "#top";
  let mode = !forced && (seen || deep) ? "short" : "full";

  const $ = (s) => document.querySelector(s);
  const h1 = $(".hero__title");
  const brand = $(".nav__brand"), brandA = $(".nav__brand .brand__a"), brandRest = $(".nav__brand .brand__rest");
  const flipEl = loader.querySelector(".intro__mark");
  const navItems = [...document.querySelectorAll(".nav__links, .nav__cta")];
  const veiled = [...document.querySelectorAll(".hero__eyebrow, .hero__mark, .hero__title, .hero__sub, .hero__actions, .hero__meta"), ...navItems, brand];

  html.classList.add("is-intro");
  if (mode === "short") loader.classList.add("is-quick");

  let resolveFn, resolved = false;
  const done = new Promise((r) => { resolveFn = r; });
  const resolveOnce = () => { if (!resolved) { resolved = true; resolveFn(api); } };

  /* ---------- clocks ---------- */
  let clock = 0, sceneT = 0, frozen = false, last = 0, lastW = 0;
  // a late start compresses scene 01 (the point still ignites from nothing, only faster); the rest keeps its timing
  let warp = 0;
  const toScene = (c) => (warp ? (c < T.core - warp ? (c * T.core) / (T.core - warp) : c + warp) : c);
  let sw0 = null, sweepT = 0, sweepDur = SWEEP[mode], sweepRate = 1;
  let started = false, ended = false, skipped = false, css = false, veil = false;
  let lastScene = -1, seekJump = false, updatedAt = -1;
  const dev = { paused: false, rate: 1 };
  const anims = [];                    // every WAAPI animation we drive (cancelled at the end)
  const sweeps = [];                   // { a, delay } driven by the sweep clock
  /** A WAAPI animation driven by the scene clock; after a skip it runs on its own, faster. */
  const track = (a, start, dur) => ({ a: [].concat(a), start, dur, t: -1, rate: 1, free: false, on: true });
  let flip = null, h1t = null, rest = null;

  const intro = forge && forge.ok ? new IntroGL(forge) : null;
  // the field queues right behind the intro shader (compiles run in order in the GPU process)
  if (intro) forge.compile();
  const geo = { cx: 0, cy: 0, S: 0 };

  /* ---------- hide the hero only after it has painted once (LCP is recorded under the loader) ---------- */
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (ended) return;
    veiled.forEach((el) => el && el.classList.add("is-veiled"));
    if (mode === "full" && h1) {
      h1t = track(h1.animate([
        { transform: "translateY(100%)", clipPath: "inset(0 0 100% 0)", visibility: "visible" },
        { transform: "translateY(0)", clipPath: "inset(0 0 0% 0)", visibility: "visible" },
      ], { duration: T.h1[1] * 1000, easing: EASE_OUT, fill: "both" }), T.h1[0], T.h1[1]);
      h1t.a[0].pause(); h1t.a[0].currentTime = 0;
      anims.push(h1t.a[0]);
    }
    veil = true;
  }));

  const place = () => {
    if (!intro) return;
    const r = forge.rect || forge.canvas.getBoundingClientRect();
    const W = r.width, H = r.height, vh = Math.min(H, innerHeight);
    geo.S = Math.round(Math.min(vh * 0.3, W * 0.44, 320));
    geo.cx = W / 2; geo.cy = vh / 2;
    intro.place(geo.cx, geo.cy, geo.S, W, H);
  };
  addEventListener("resize", place, { passive: true });

  /* ---------- the heat‑mask reveal of DOM elements, locked to the shader's front ----------
     The front runs over uv x = −0.25 … 1.25 during the sweep, so it moves at 1.5·vw / dur.
     arm() puts an element behind its (closed) mask early, in the near‑black first frames of scene 01:
     it is rastered once there, unseen and without moving the layout — not as a 170 ms GPU stall
     at the very moment the reveal starts. time() only sets the timing when the sweep begins. */
  const armed = [];
  const arm = (el) => {
    if (!el || el._armed) return;
    el._armed = true;
    const vis = { visibility: "visible" };
    if (MASK) el.classList.add("is-sweeping");
    const a = MASK
      ? el.animate([{ ...vis, maskPosition: "100% 0", webkitMaskPosition: "100% 0" }, { ...vis, maskPosition: "0% 0", webkitMaskPosition: "0% 0" }], { duration: 1000, fill: "both" })
      : el.animate([{ ...vis, clipPath: "inset(0 100% 0 0)" }, { ...vis, clipPath: "inset(0 0% 0 0)" }], { duration: 1000, fill: "both" });
    // and a short settle, so the reveal has weight
    const b = el.animate([{ translate: "0 10px" }, { translate: "0 0" }], { duration: 1000, easing: EASE_OUT, fill: "both" });
    for (const x of [a, b]) { x.pause(); x.currentTime = 0; anims.push(x); }
    armed.push({ el, a, b, timed: false });
  };
  const time = (rec) => {
    if (rec.timed) return;
    rec.timed = true;
    const r = rec.el.getBoundingClientRect();
    const vw = innerWidth, v = (1.5 * vw) / sweepDur;
    const dur = MASK ? (2 * r.width) / v : r.width / v;
    const delay = MASK ? (r.left - 0.5 * r.width + 0.25 * vw) / v : (r.left + 0.25 * vw) / v;
    rec.a.effect.updateTiming({ duration: Math.max(1, dur * 1000) });
    rec.b.effect.updateTiming({ duration: Math.max(dur, 0.7) * 1000 });
    sweeps.push({ a: rec.a, delay }, { a: rec.b, delay });
  };
  const sweepEl = (el) => { arm(el); armed.filter((x) => x.el === el).forEach(time); };

  const api = {
    mode,
    /** Reveals hero items behind the heat front (call right after the promise resolves). */
    sweep(items) {
      const list = [...items, ...navItems];
      if (!flip || !flip.on) list.push(brand);
      list.forEach((el) => { if (!(el === h1 && h1t && h1t.on)) sweepEl(el); });
      armed.forEach(time);
      drive(0);
    },
    /** Pours the metal into the wordmark, left to right; cb when full. */
    pour(f, cb) {
      if (!f) return;
      if (ended && sweeps.length === 0 && !pouring && html.classList.contains("is-failsafe")) { f.ignite = 1; if (cb) cb(); return; }
      pourCb = cb || null; pouring = true;
    },
  };
  let pouring = false, pourCb = null, pourDone = false;

  /* ---------- scene: pure function of sceneT ---------- */
  const scene = (t) => {
    const v = intro.v;
    if (mode === "short") {
      v.core = easeInOut(seg(t, 0, SHORT_AT));
      v.lightK = 0.04 + 0.36 * v.core;
      v.markOn = 0; v.rise = 0;
      return;
    }
    v.core = easeInOut(seg(t, 0, T.core)) * (1 - seg(t, 0.9, 1.25));
    v.lightK = 0.04 + 0.36 * easeInOut(seg(t, 0, T.core)) + 0.22 * easeInOut(seg(t, 0.9, 2.3)) - 0.17 * easeOut(seg(t, 2.45, 3.2));
    v.crack = 1.04 * easeInOut(seg(t, 0.9, 2.1));
    v.fill = 1.06 * easeInOut(seg(t, 1.3, 2.35));
    const ti = t - T.impact;
    v.hot = ti >= 0 ? Math.exp(-ti * 7) : 0;
    v.flash = ti >= 0 ? Math.exp(-ti * 22) : 0;
    v.strike = [geo.cx, geo.cy, ti >= 0 ? ti : 9, ti >= 0 ? 1 : 0];
    v.solid = easeOut(seg(t, 2.42, 3.0));
    v.sweep = -0.4 + 2 * easeInOut(seg(t, 2.55, 3.05));
    v.markOn = t < T.handoff ? 1 : 0;
    v.rise = easeOut(seg(t, 3.25, 3.7));
  };

  /** one‑shot moments, fired only when the clock crosses them going forward */
  const moments = (from, to) => {
    if (mode !== "full") return;
    if (from < T.impact && to >= T.impact) {
      if (sparks) sparks.burst(geo.cx, geo.cy + geo.S * 0.1, state.mobile ? 26 : 70, state.mobile ? 0.55 : 0.85);
      forge.canvas.animate([
        { transform: "translate(0,0)" }, { transform: "translate(-2px,1px)" }, { transform: "translate(2px,-1px)" },
        { transform: "translate(-1px,1px)" }, { transform: "translate(0,0)" },
      ], { duration: 220, easing: "cubic-bezier(.36,.07,.19,.97)" });
    }
    if (from < T.handoff && to >= T.handoff && !flip) startFlip();
  };

  /* FLIP of the forged mark onto .brand__a. The path curves: it rises and shrinks first (ease‑out)
     so it clears the wordmark before the letters come up, and drifts sideways (ease‑in‑out). */
  const startFlip = () => {
    if (!flipEl || !brandA) return;
    const S = geo.S, tr = brandA.getBoundingClientRect();
    const k = tr.width / S;
    const fly = flipEl.parentElement;
    flipEl.style.width = flipEl.style.height = `${S}px`;
    flipEl.toggleAttribute("hidden", false);
    html.classList.add("is-flip");
    const opts = { duration: T.flip[1] * 1000, fill: "both" };
    const ax = fly.animate([{ transform: `translateX(${geo.cx - S / 2}px)` }, { transform: `translateX(${tr.left}px)` }], { ...opts, easing: EASE_INOUT });
    const ay = flipEl.animate([
      { transform: `translateY(${geo.cy - S / 2}px) scale(1)` },
      { transform: `translateY(${tr.top}px) scale(${k})` },
    ], { ...opts, easing: EASE_LIFT });
    for (const a of [ax, ay]) { a.pause(); a.currentTime = 0; anims.push(a); }
    flip = track([ax, ay], T.flip[0], T.flip[1]);
  };

  const landFlip = () => {
    if (!flip || !flip.on) return;
    flip.on = false;
    html.classList.remove("is-flip");
    flipEl.toggleAttribute("hidden", true);
    brand.classList.remove("is-veiled");
    // the rest of the word follows the A it just landed next to
    if (brandRest) {
      brandRest.classList.add("is-sweeping");
      const a = MASK
        ? brandRest.animate([{ maskPosition: "100% 0", webkitMaskPosition: "100% 0" }, { maskPosition: "0% 0", webkitMaskPosition: "0% 0" }], { duration: 420, fill: "both" })
        : brandRest.animate([{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }], { duration: 420, fill: "both" });
      a.pause(); a.currentTime = 0; anims.push(a);
      rest = track(a, T.flip[0] + T.flip[1], 0.42);
      if (frozen || skipped) { rest.free = true; rest.t = 0; rest.rate = 0.42 / 0.15; }
    }
  };

  const driveTrack = (tr, dt) => {
    if (!tr || !tr.on) return;
    tr.t = tr.free ? tr.t + dt * tr.rate : sceneT - tr.start;
    for (const a of tr.a) a.currentTime = clamp(tr.t, 0, tr.dur) * 1000;
  };

  /** advances the DOM sweep + pour */
  const drive = (dt) => {
    if (sw0 === null) return;
    sweepT = Math.max(sweepT, 0);
    for (const s of sweeps) s.a.currentTime = (sweepT - s.delay) * 1000;
    if (intro) intro.v.reveal = -0.25 + 1.5 * clamp(sweepT / sweepDur);
    if (pouring && forge && !pourDone) {
      const p = clamp((clock - sw0) / POUR);
      forge.ignite = 1 - Math.pow(1 - p, 3);
      if (p >= 1) { pourDone = true; if (pourCb) pourCb(); }
    }
  };

  const startSweep = (dur) => {
    if (sw0 !== null) return;
    sweepDur = dur;
    // starts now; only a dev seek past the start pins it to scene time, so the seeked frame is exact
    const at = mode === "short" ? SHORT_AT : T.sweep;
    sw0 = seekJump && !frozen && !css ? clock - Math.max(0, sceneT - at) : clock;
    seekJump = false;
    sweepT = clock - sw0;
    if (intro && started) {
      forge.field = true;
      forge.cold = 1; forge.ignite = 0;
      // the field's light picks up exactly where the intro light is
      const [lx, ly] = intro.toPx(intro.css.lx, intro.css.ly);
      if (!forge.hasPointer) { forge.mx = forge.tx = lx; forge.my = forge.ty = ly; }
    }
    if (css) loaderOut(dur);
    html.classList.remove("is-loading");
    resolveOnce();
  };

  /* ---------- skip: Esc, scroll, wheel, touch, click, the button, or focus moving on ---------- */
  const skip = () => {
    if (skipped || ended || hold) return;
    skipped = true;
    // whatever is in flight finishes inside the 400 ms exit
    const toFinish = (tr, s = 0.22) => { if (tr && tr.on && tr.t >= 0) { tr.free = true; tr.rate = Math.max(1, (tr.dur - tr.t) / s); } };
    if (sw0 === null) {
      frozen = true;
      if (flip && flip.on) toFinish(flip);
      if (h1t && h1t.on) {
        if (h1t.t > 0) toFinish(h1t);
        else { h1t.on = false; h1t.a[0].cancel(); }   // not started: the h1 rides the sweep instead
      }
      if (!started || (intro && !forge.poll())) {
        // the shader is not up yet: the (opaque) loader itself burns away instead
        css = true;
        loader.classList.remove("is-live");
        loader.classList.add("is-css");
        if (forge) { forge.compile(); paintText(); }
      }
      startSweep(SWEEP.skip);
    } else {
      sweepRate = Math.max(1, (sweepDur - sweepT) / (SWEEP.skip - 0.05));
      toFinish(flip); toFinish(h1t); toFinish(rest, 0.15);
    }
  };
  const SCROLL_KEYS = ["PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End", " "];
  const onKey = (e) => {
    if (e.key === "Escape" || (SCROLL_KEYS.includes(e.key) && e.target !== skipBtn)) skip();
  };
  // focus moving anywhere else (Tab to "Saltar al contenido", a link…) means: show me the page
  const onFocus = (e) => { if (e.target !== skipBtn && e.target !== document.body) skip(); };
  const onSkipBtn = () => skip();
  const listen = (on) => {
    const m = on ? "addEventListener" : "removeEventListener";
    window[m]("keydown", onKey);
    window[m]("wheel", skip, { passive: true });
    window[m]("touchstart", skip, { passive: true });
    window[m]("pointerdown", skip, { passive: true });
    document[m]("focusin", onFocus);
    if (skipBtn) skipBtn[m]("click", onSkipBtn);
  };
  listen(true);

  /** every veiled piece except the h1 (it has its own entrance) and the brand (it may get the flight) */
  function armAll() {
    veiled.forEach((el) => { if (el && el !== brand && !(el === h1 && h1t && h1t.on)) { arm(el); el.classList.remove("is-veiled"); } });
  }

  /** the hero wordmark, with the real face if it has arrived (fonts.ready repaints it otherwise) */
  function paintText() {
    if (!forge || forge.textReady || !forge.opts.textEl) return;
    forge.drawText();
    if (document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(() => forge.drawText());
  }

  /* ---------- CSS fallback (no WebGL): a glowing point, then the loader burns away ---------- */
  const loaderOut = (dur) => {
    loader.classList.add("is-sweeping-out");
    const a = MASK
      ? loader.animate([{ maskPosition: "100% 0", webkitMaskPosition: "100% 0" }, { maskPosition: "0% 0", webkitMaskPosition: "0% 0" }], { duration: dur * 1000, fill: "both" })
      : loader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur * 1000, fill: "both" });
    a.pause(); anims.push(a);
    sweeps.push({ a, delay: 0 });
  };

  /* ---------- per frame, inside forge.render (so GL and DOM change in the same frame) ---------- */
  const update = (s) => {
    updatedAt = s.time;
    const now = performance.now();
    // capped at 0.25 s: slow devices keep real time (and the 6 s budget); a tab coming back does not jump
    let dt = last ? Math.min(0.25, (now - last) / 1000) : 0;
    last = now;
    if (dev.paused) dt = 0;
    dt *= dev.rate;
    if (ended || css) return;
    if (!started) {
      if (!veil || !intro.ready()) return;
      started = true;
      place();
      loader.classList.add("is-live");
      forge.compile();   // the field is needed at the reveal; now it can take its turn
      // a slow start eats into the darkness of scene 01, never into the end: the whole thing
      // stays inside ~6 s from navigation. Too late even for that → the short version.
      const late = hold ? 0 : now / 1000 + T.sweep + SWEEP.full - 5.9;
      if (mode === "full" && late > 1.1) { mode = api.mode = "short"; sweepDur = SWEEP.short; if (h1t) { h1t.on = false; h1t.a[0].cancel(); } }
      else if (mode === "full" && late > 0) warp = Math.min(late, 0.55);
    }
    window.__ardentiumBeat = now;
    // the heavy one‑off work (wordmark texture, hero raster behind its masks) happens in the
    // near‑black first frames of scene 01, where a dropped frame cannot be seen
    if (!forge.textReady && !armed.length) { paintText(); armAll(); }
    const prev = sceneT;
    clock += dt;
    if (!frozen) sceneT = toScene(clock);
    moments(prev, sceneT);
    if (!frozen || lastScene < 0) { scene(sceneT); lastScene = sceneT; }
    driveTrack(flip, dt); driveTrack(h1t, dt); driveTrack(rest, dt);
    if (flip && flip.on && flip.t >= flip.dur) landFlip();

    const at = mode === "short" ? SHORT_AT : T.sweep;
    if (sw0 === null && sceneT >= at && forge.poll()) startSweep(sweepDur);
    if (sw0 !== null) { sweepT += dt * sweepRate; drive(dt); }
    const settled = (tr) => !tr || !tr.on || tr.t >= tr.dur;
    if (!hold && sw0 !== null && sweepT >= sweepDur + (skipped ? 0 : 0.05) && (!flip || !flip.on) && settled(h1t) && settled(rest)) finish();
  };

  /* ---------- watchdog: GL never came up, the deadline, the pour after the scene is gone ---------- */
  const t0 = performance.now();
  let cssStart = 0;
  const watch = onTick((s) => {
    const now = performance.now();
    if (!ended) window.__ardentiumBeat = now;
    if (html.classList.contains("is-failsafe")) { abort(); return; }
    // the hero canvas only renders while it is on screen; if a skip scrolled it away (focus jumping to
    // a control further down, a big wheel), the clocks keep running from here so the exit completes
    if (intro && started && !ended && !css && updatedAt !== s.time) update(s);
    if (!ended && !started && !css && (!intro || !forge.ok || intro.prog.failed || now - t0 > 2500)) {
      css = true; cssStart = clock;
      loader.classList.add("is-css");
      if (forge) { forge.compile(); paintText(); }
    }
    if (css && !ended && veil) {
      // no shader: drive the clocks from here (own timestamp: update() keeps its own)
      const dt = lastW ? Math.min(0.25, (now - lastW) / 1000) : 0;
      lastW = now;
      clock += dt;
      if (sw0 === null && clock - cssStart >= (mode === "short" ? SHORT_AT : 1.1)) startSweep(SWEEP[mode] * 0.8);
      if (sw0 !== null) { sweepT += dt * sweepRate; drive(dt); }
      if (sw0 !== null && sweepT >= sweepDur + (skipped ? 0 : 0.05)) finish();
    }
    if (!ended && sw0 === null && performance.now() > DEADLINE - SWEEP.skip * 1000) skip();
    if (ended && pouring && !pourDone && forge) {
      // the pour outlives the intro by ~0.6 s; it keeps real time too
      clock += lastW ? Math.min(0.25, (now - lastW) / 1000) : 0;
      lastW = now;
      drive(0);
    }
    if (ended && (!pouring || pourDone)) watch();
  });

  if (intro) forge.overlay = (gl, s) => { update(s); if (started && !ended && !css) intro.draw(gl, s); };
  if (intro) forge.field = false;

  function finish() {
    if (ended) return;
    ended = true;
    if (forge) { forge.compile(); paintText(); }
    if (intro) {
      forge.overlay = null;
      forge.field = true;
      intro.dispose();
    }
    listen(false);
    removeEventListener("resize", place);
    // the skip button is about to disappear: keyboard focus lands on the start of the page, not on <body>
    const hadFocus = document.activeElement === skipBtn;
    sweeps.length = 0;
    anims.forEach((a) => a.cancel());
    veiled.forEach((el) => el && el.classList.remove("is-veiled"));
    document.querySelectorAll(".is-sweeping").forEach((el) => el.classList.remove("is-sweeping"));
    html.classList.remove("is-intro", "is-flip", "is-loading");
    loader.hidden = true;
    if (flipEl) flipEl.toggleAttribute("hidden", true);
    hideChrome();
    if (hadFocus && brand) brand.focus({ preventScroll: true });
    window.__ardentiumDone = true;
    if (sw0 === null) sw0 = clock;
    resolveOnce();
  }
  function abort() { if (!ended) { pouring = false; finish(); if (forge) forge.ignite = 1; } }

  if (import.meta.env.DEV) {
    import("./intro-dev.js").then((m) => m.attach({
      get t() { return clock; },
      get mode() { return mode; },
      seek(t) {
        const from = sceneT;
        seekJump = true;
        clock = Math.max(0, t);
        if (!frozen) sceneT = toScene(clock);
        moments(from, sceneT);
        if (intro && started) scene(sceneT);
        for (const tr of [flip, h1t, rest]) if (tr && !tr.free) tr.on = true;
        if (flip) {
          const flying = sceneT >= flip.start && sceneT < flip.start + flip.dur;
          flipEl.toggleAttribute("hidden", !flying);
          html.classList.toggle("is-flip", sceneT < flip.start + flip.dur);
        }
        if (sw0 !== null) { sweepT = clock - sw0; drive(0); }
      },
      pause() { dev.paused = true; },
      play() { dev.paused = false; },
      rate(r) { dev.rate = r; },
      hold,
    }));
  }

  return done;
}
