/**
 * One requestAnimationFrame loop for the whole page, plus shared scroll + pointer state.
 * The loop is gsap.ticker (GSAP tweens and ScrollTrigger scrubs update first, then this frame).
 * Every effect subscribes here instead of running its own loop.
 * Each frame runs in two phases: every onRead() callback first (reads only), then every onTick()
 * callback (writes only). Element positions come from trackRect(): page offsets cached until the
 * layout changes, plus the scroll — so no frame ever forces a style + layout flush to read them.
 */
import { gsap } from "./gsap.js";

const reads = new Set();
const subs = new Set();
let last = performance.now();
let running = false;

export const state = {
  time: 0,          // seconds since boot
  dt: 0,            // seconds since previous frame (clamped)
  vw: innerWidth,
  vh: innerHeight,
  scrollY: scrollY,
  scrollVel: 0,     // smoothed px/frame, signed
  scrollDir: 1,
  mouseX: innerWidth / 2,
  mouseY: innerHeight / 2,
  mouseVX: 0,
  mouseVY: 0,
  pointerFine: matchMedia("(hover: hover) and (pointer: fine)").matches,
  reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
  mobile: matchMedia("(max-width: 760px)").matches,
};

let rawScroll = scrollY;
addEventListener("scroll", () => { rawScroll = scrollY; }, { passive: true });
addEventListener("resize", () => {
  state.vw = innerWidth;
  state.vh = innerHeight;
  state.mobile = innerWidth <= 760;
}, { passive: true });
addEventListener("pointermove", (e) => {
  state.mouseVX = e.clientX - state.mouseX;
  state.mouseVY = e.clientY - state.mouseY;
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;
}, { passive: true });

function frame(now) {
  state.dt = Math.min((now - last) / 1000, 1 / 20);
  last = now;
  state.time += state.dt;

  const delta = rawScroll - state.scrollY;
  state.scrollY = rawScroll;
  state.scrollVel += (delta - state.scrollVel) * 0.2;
  if (Math.abs(delta) > 0.5) state.scrollDir = Math.sign(delta);
  state.mouseVX *= 0.85;
  state.mouseVY *= 0.85;

  updateRects();
  for (const fn of reads) fn(state);
  for (const fn of subs) fn(state);
}

/* ---------- tracked rects: page geometry measured only when the layout changes ---------- */
const tracked = new Set();
let geoDirty = true;
const invalidate = () => { geoDirty = true; };
addEventListener("resize", invalidate, { passive: true });
if ("ResizeObserver" in window) new ResizeObserver(invalidate).observe(document.body);
if (document.fonts) document.fonts.ready.then(invalidate);

function updateRects() {
  if (!tracked.size) return;
  if (geoDirty) {
    geoDirty = false;
    // offsets ignore transforms (an entrance still settling does not skew the cache)
    for (const t of tracked) {
      let x = 0, y = 0, n = t.el;
      while (n) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      t.px = x; t.py = y; t.width = t.el.offsetWidth; t.height = t.el.offsetHeight;
    }
  }
  for (const t of tracked) {
    t.top = t.py - state.scrollY; t.bottom = t.top + t.height;
    t.left = t.px; t.right = t.px + t.width;
  }
}

/**
 * A live viewport rect for el ({ top, bottom, left, right, width, height }), refreshed every frame
 * from cached page offsets. Not for position: sticky / fixed elements.
 */
export function trackRect(el) {
  const t = { el, px: 0, py: 0, top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
  tracked.add(t);
  geoDirty = true;
  updateRects();
  return t;
}

function start() {
  if (!running) { running = true; last = performance.now(); gsap.ticker.add(() => frame(performance.now())); }
}

export function onTick(fn) {
  subs.add(fn);
  start();
  return () => subs.delete(fn);
}

/** Layout reads for this frame (getBoundingClientRect etc.); runs before any onTick write. */
export function onRead(fn) {
  reads.add(fn);
  start();
  return () => reads.delete(fn);
}

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Runs cb(true/false) as the element enters / leaves the viewport (with margin). */
export function watchVisible(el, cb, rootMargin = "0px") {
  if (!("IntersectionObserver" in window)) { cb(true); return; }
  new IntersectionObserver((entries) => entries.forEach((e) => cb(e.isIntersecting)), { rootMargin }).observe(el);
}
