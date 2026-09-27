/**
 * FOOTER GIANT — an outlined ARDENTIUM sized to the full width; a molten copy on top is
 * revealed only around the cursor, so the word melts wherever you pass. On touch screens
 * the hot spot sweeps across by itself while the footer is visible.
 */
import { state, watchVisible } from "./ticker.js";

export function initFooterGiant() {
  const box = document.getElementById("footGiant");
  if (!box) return null;
  const line = box.querySelector(".giant--line");

  // scale the font so the word spans the available width, whatever the typeface ends up being
  const fit = () => {
    box.style.setProperty("--giant", "100px");
    const pad = parseFloat(getComputedStyle(line).paddingLeft) * 2;
    const inner = [...line.children].reduce((w, c) => w + c.getBoundingClientRect().width, 0);
    const avail = box.clientWidth - pad;
    if (inner > 0) box.style.setProperty("--giant", `${Math.floor(100 * (avail / inner) * 0.985)}px`);
  };
  fit();
  addEventListener("resize", fit, { passive: true });
  if (document.fonts) document.fonts.ready.then(fit);

  let visible = false;
  watchVisible(box, (v) => { visible = v; });

  if (state.pointerFine && !state.reduced) {
    box.addEventListener("pointermove", (e) => {
      const r = box.getBoundingClientRect();
      box.style.setProperty("--mx", `${e.clientX - r.left}px`);
      box.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
    box.addEventListener("pointerleave", () => {
      box.style.setProperty("--mx", "-9999px");
      box.style.setProperty("--my", "-9999px");
    });
    return null;
  }
  if (state.reduced) {
    box.style.setProperty("--mx", "50%");
    box.style.setProperty("--my", "50%");
    return null;
  }
  return (s) => {
    if (!visible) return;
    const w = box.clientWidth, h = box.clientHeight;
    box.style.setProperty("--mx", `${w * (0.5 + 0.42 * Math.sin(s.time * 0.7))}px`);
    box.style.setProperty("--my", `${h * (0.55 + 0.12 * Math.sin(s.time * 1.3))}px`);
  };
}
