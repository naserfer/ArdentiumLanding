/**
 * One requestAnimationFrame loop for the whole page plus the shared pointer state.
 * Effects subscribe with onTick(); the loop only runs while at least one subscriber says it is
 * busy (returns true), so an idle page costs nothing.
 */
export const state = {
  time: 0,        // seconds since boot
  dt: 0,          // seconds since the previous frame (clamped)
  vw: innerWidth,
  vh: innerHeight,
  mouseX: innerWidth / 2,
  mouseY: innerHeight / 2,
  pointerFine: matchMedia("(hover: hover) and (pointer: fine)").matches,
  reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
  mobile: innerWidth <= 760,
};

addEventListener("resize", () => {
  state.vw = innerWidth;
  state.vh = innerHeight;
  state.mobile = innerWidth <= 760;
}, { passive: true });

addEventListener("pointermove", (e) => {
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;
}, { passive: true });

const subs = new Set();
let raf = 0;
let last = 0;

function frame(now) {
  state.dt = Math.min((now - last) / 1000, 1 / 20);
  last = now;
  state.time += state.dt;
  let busy = false;
  for (const fn of subs) if (fn(state) !== false) busy = true;
  raf = busy && !document.hidden ? requestAnimationFrame(frame) : 0;
}

/** Wakes the loop (call after something becomes busy again, e.g. a click or the hero re-entering). */
export function wake() {
  if (raf || document.hidden) return;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}
document.addEventListener("visibilitychange", wake);

/** fn(state) runs every frame; returning false means "nothing to do", letting the loop sleep. */
export function onTick(fn) {
  subs.add(fn);
  wake();
  return () => subs.delete(fn);
}

/** cb(true/false) as the element enters / leaves the viewport (with margin). */
export function watchVisible(el, cb, rootMargin = "0px") {
  if (!el) return;
  if (!("IntersectionObserver" in window)) { cb(true); return; }
  new IntersectionObserver((entries) => entries.forEach((e) => cb(e.isIntersecting)), { rootMargin }).observe(el);
}

export const lerp = (a, b, t) => a + (b - a) * t;
