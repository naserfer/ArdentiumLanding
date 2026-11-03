/**
 * Small heat details, each one cheap (transforms, CSS variables, a few particles) and each one
 * tied to the forge: element tiles that tilt toward the cursor, molten buttons that spit sparks,
 * the incandescent edge of "vanguardia" following the cursor, and headings that land with sparks.
 * Fine pointers only where it needs hover; nothing runs with reduced motion.
 */
import { state } from "../fx/loop.js";

/** Element tiles lean toward the cursor (3D tilt + a moving glare). Desktop only. */
export function initTilt() {
  if (!state.pointerFine || state.reduced) return;
  document.querySelectorAll("[data-tilt]").forEach((el) => {
    let frame = 0, px = 0.5, py = 0.5;
    const apply = () => {
      frame = 0;
      el.style.setProperty("--ry", `${((px - 0.5) * 16).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${((0.5 - py) * 12).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
    };
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width;
      py = (e.clientY - r.top) / r.height;
      if (!frame) frame = requestAnimationFrame(apply);
    });
    el.addEventListener("pointerleave", () => {
      cancelAnimationFrame(frame); frame = 0;
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    });
  });
}

/** Molten buttons throw a few sparks off their top edge on hover. Desktop only. */
export function initButtonSparks(sparks) {
  if (!sparks || !state.pointerFine) return;
  document.querySelectorAll(".btn--molten").forEach((b) => b.addEventListener("pointerenter", () => {
    const r = b.getBoundingClientRect();
    sparks.line(r.left + 12, r.right - 12, r.top + 2, 7);
  }));
}

/** The incandescent edge of "vanguardia" follows the cursor across the hero. Desktop only. */
export function initTitleHeat() {
  const em = document.querySelector(".hero__title em");
  const hero = document.getElementById("top");
  if (!em || !hero || !state.pointerFine || state.reduced) return;
  let frame = 0, x = 0, y = 0;
  hero.addEventListener("pointermove", (e) => {
    x = e.clientX; y = e.clientY;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const r = em.getBoundingClientRect();
      em.style.setProperty("--hx", `${(x - r.left).toFixed(1)}px`);
      em.style.setProperty("--hy", `${(y - r.top).toFixed(1)}px`);
    });
  }, { passive: true });
  hero.addEventListener("pointerleave", () => em.style.setProperty("--hx", "-999px"));
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
