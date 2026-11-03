/**
 * Small heat details, cheap and tied to the forge: molten buttons that spit sparks (hover or touch)
 * and headings that land with sparks. Nothing runs with reduced motion.
 */
import { state } from "../fx/loop.js";

/** Molten buttons throw a few sparks off their top edge: on hover with a mouse, on touch with a finger. */
export function initButtonSparks(sparks) {
  if (!sparks) return;
  const ev = state.pointerFine ? "pointerenter" : "pointerdown";
  document.querySelectorAll(".btn--molten, .wa-float").forEach((b) => b.addEventListener(ev, () => {
    const r = b.getBoundingClientRect();
    sparks.line(r.left + 12, r.right - 12, r.top + 2, state.pointerFine ? 7 : 14);
  }, { passive: true }));
}

/** When a section heading lands it is "struck": the CSS flash plus a line of sparks under it. */
export function headingSparks(sparks) {
  if (!sparks) return null;
  return (el) => {
    const h = el.matches(".display, .cta__title") ? el : el.querySelector(".display");
    if (!h) return;
    setTimeout(() => {
      const r = h.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const x1 = r.left + Math.min(r.width, innerWidth - r.left);
      sparks.line(r.left, x1, r.bottom - r.height * 0.15, state.mobile ? 14 : 30);
    }, 260);
  };
}
