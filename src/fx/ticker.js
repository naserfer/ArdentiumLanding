/**
 * One requestAnimationFrame loop for the whole page, plus shared scroll + pointer state.
 * Every effect subscribes here instead of running its own loop.
 */
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

  for (const fn of subs) fn(state);
  requestAnimationFrame(frame);
}

export function onTick(fn) {
  subs.add(fn);
  if (!running) { running = true; requestAnimationFrame((t) => { last = t; frame(t); }); }
  return () => subs.delete(fn);
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
