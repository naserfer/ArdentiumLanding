/**
 * CURSOR — a glowing ember (dot) with a lagging ring. The ring swells over links and shows
 * a verb for elements that carry data-cursor="…". Fine pointers only.
 */
import { state, lerp } from "./ticker.js";

export function initCursor(root = document.getElementById("cursor")) {
  if (!root || !state.pointerFine || state.reduced) return null;
  document.documentElement.classList.add("has-cursor");
  const dot = root.querySelector(".cursor__dot");
  const ring = root.querySelector(".cursor__ring");
  const label = root.querySelector(".cursor__label");
  let rx = state.mouseX, ry = state.mouseY;
  let shown = false;
  root.style.opacity = "0";

  addEventListener("pointermove", () => {
    if (!shown) { shown = true; root.style.opacity = "1"; }
  }, { passive: true });
  document.addEventListener("pointerleave", () => { root.style.opacity = "0"; shown = false; });
  addEventListener("pointerdown", () => root.classList.add("is-down"));
  addEventListener("pointerup", () => root.classList.remove("is-down"));

  document.addEventListener("pointerover", (e) => {
    const t = e.target.closest("a, button, [data-cursor], [data-spot], [data-tilt]");
    const text = t && t.getAttribute("data-cursor");
    root.classList.toggle("is-label", !!text);
    root.classList.toggle("is-hover", !!t && !text);
    if (text) label.textContent = text;
  });

  return (s) => {
    rx = lerp(rx, s.mouseX, 0.18);
    ry = lerp(ry, s.mouseY, 0.18);
    dot.style.transform = `translate3d(${s.mouseX}px, ${s.mouseY}px, 0)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
  };
}
