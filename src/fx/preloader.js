/**
 * PRELOADER — "encendiendo la forja".
 * The mark draws itself in CSS while a pyrometer climbs to 1538 °C; then a molten seam
 * splits the screen and the two doors of the furnace open onto the hero.
 * Resolves when the doors start opening. Repeat visits in the same tab get a short version.
 */
import { state, easeOutExpo } from "./ticker.js";

export function runPreloader() {
  const loader = document.getElementById("loader");
  const html = document.documentElement;
  if (!loader || state.reduced) {
    html.classList.remove("is-loading");
    if (loader) loader.hidden = true;
    return Promise.resolve();
  }

  let seen = false;
  try { seen = sessionStorage.getItem("ard-intro") === "1"; sessionStorage.setItem("ard-intro", "1"); } catch (_) { /* storage blocked */ }
  const DUR = seen ? 600 : 1350;
  if (seen) loader.classList.add("is-quick");

  const temp = document.getElementById("loaderTemp");
  const bar = document.getElementById("loaderBar");
  const fonts = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1600))]) : Promise.resolve();

  return new Promise((resolve) => {
    const start = performance.now();
    let fontsDone = false;
    fonts.then(() => { fontsDone = true; });
    const step = (now) => {
      const p = Math.min(1, (now - start) / DUR);
      const e = easeOutExpo(p);
      temp.textContent = String(Math.round(e * 1538)).padStart(4, "0");
      bar.style.transform = `scaleX(${e})`;
      if (p < 1 || !fontsDone) { requestAnimationFrame(step); return; }
      loader.classList.add("is-seam");
      setTimeout(() => {
        loader.classList.add("is-open");
        html.classList.remove("is-loading");
        resolve();
        setTimeout(() => { loader.hidden = true; }, 1200);
      }, 420);
    };
    requestAnimationFrame(step);
  });
}
