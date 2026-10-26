/**
 * The dive through the "d" (html.ch-on only) is a moment, not a scroll distance: a fast flick
 * used to cross the whole 100svh in two frames and land inside without the zoom ever being seen.
 * Between the top of the hero and the arrival at #nombre, a scroll gesture (wheel, swipe or key)
 * no longer moves the page directly: it plays the passage, always at the same pace, by scrolling
 * the page itself. Everything scroll-driven (the letter, the landing, the tunnel) stays in sync.
 * The input that keeps coming during and right after the passage (trackpad inertia, the rest of
 * the swipe) is absorbed, so it does not carry you past the landing.
 */
import { state, clamp } from "./ticker.js";

const html = document.documentElement;
const IN_MS = 1750;
const OUT_MS = 1250;
const QUIET_MS = 180;
const MAX_STEP_MS = 50;
const KEYS_DOWN = new Set(["ArrowDown", "PageDown", " "]);
const KEYS_UP = new Set(["ArrowUp", "PageUp"]);
const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);

export function initDive() {
  if (state.reduced || !html.classList.contains("ch-on")) return;
  const land = document.getElementById("nombre");
  if (!land || !land.offsetParent) return;

  let end = 0;
  const measure = () => { end = Math.round(land.getBoundingClientRect().top + scrollY); };
  measure();
  addEventListener("resize", measure, { passive: true });
  if (document.fonts) document.fonts.ready.then(measure);

  let anim = null, quietUntil = 0;
  const busy = () =>
    html.classList.contains("is-loading") || html.classList.contains("is-intro") ||
    html.classList.contains("lb-open") || html.classList.contains("menu-open");
  const inZone = (dir) => (dir > 0 ? scrollY < end - 2 : scrollY > 2 && scrollY <= end + 2);

  const go = (dir) => {
    measure();
    const from = scrollY, to = dir > 0 ? end : 0;
    const dur = (dir > 0 ? IN_MS : OUT_MS) * clamp(Math.abs(to - from) / Math.max(1, end), 0.35, 1);
    let set = from, t = 0, last = performance.now();
    html.classList.add("is-diving");
    // paced by frames, not by the clock: a stalled frame (first raster of the giant letter, a shader
    // compiling right after the intro, Safari above all) holds the dive instead of skipping it
    const step = (now) => {
      // someone else moved the page (scrollbar drag, an anchor): let go
      if (Math.abs(scrollY - set) > 48) return stop();
      t = clamp(t + clamp(now - last, 0, MAX_STEP_MS) / dur);
      last = now;
      set = Math.round(from + (to - from) * ease(t));
      scrollTo({ top: set, behavior: "instant" });
      if (t < 1) anim = requestAnimationFrame(step);
      else stop();
    };
    anim = requestAnimationFrame(step);
  };
  const stop = () => {
    cancelAnimationFrame(anim);
    anim = null;
    quietUntil = performance.now() + QUIET_MS;
    html.classList.remove("is-diving");
  };
  /** true when this input must not scroll the page */
  const take = (dir) => {
    const now = performance.now();
    if (anim || now < quietUntil) { quietUntil = Math.max(quietUntil, now + QUIET_MS); return true; }
    if (busy() || !inZone(dir)) return false;
    go(dir);
    return true;
  };

  addEventListener("wheel", (e) => {
    if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX) || !e.deltaY) return;
    if (take(Math.sign(e.deltaY))) e.preventDefault();
  }, { passive: false });

  let touch = null;
  addEventListener("touchstart", (e) => {
    touch = e.touches.length === 1 ? { y: e.touches[0].clientY, x: e.touches[0].clientX, held: !!anim } : null;
  }, { passive: true });
  // iOS commits a touch to native scrolling (with momentum, and no longer cancelable) on its very
  // first touchmove, however small: the decision has to be taken there, not after a threshold
  addEventListener("touchmove", (e) => {
    if (!touch || !e.cancelable) return;
    if (touch.held || anim) { e.preventDefault(); return; }
    const dy = touch.y - e.touches[0].clientY, dx = touch.x - e.touches[0].clientX;
    if (!dy && !dx) return;
    if (!dy || Math.abs(dy) < Math.abs(dx) || busy() || !inZone(Math.sign(dy))) { touch = null; return; }
    touch.held = true;
    e.preventDefault();
    go(Math.sign(dy));
  }, { passive: false });
  addEventListener("touchend", () => { touch = null; }, { passive: true });
  addEventListener("touchcancel", () => { touch = null; }, { passive: true });

  addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t.closest?.("input, textarea, select, [contenteditable]")) return;
    if (e.key === " " && t.closest?.("a, button, summary")) return;
    const dir = KEYS_DOWN.has(e.key) && !e.shiftKey ? 1 : KEYS_UP.has(e.key) || (e.key === " " && e.shiftKey) ? -1 : 0;
    if (dir && take(dir)) e.preventDefault();
  });
}
