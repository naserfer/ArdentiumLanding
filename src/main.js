/**
 * ARDENTIUM · landing
 * No runtime dependencies: one WebGL shader for the hero, a 2D spark canvas and a single
 * requestAnimationFrame loop that sleeps whenever nothing is moving.
 */
import { CONFIG, waLink, waPretty } from "./config.js";
import { state, onTick, wake, watchVisible } from "./fx/loop.js";
import { Forge } from "./fx/forge.js";
import { Sparks } from "./fx/sparks.js";
import { initNav } from "./ui/nav.js";
import { initReveal, initCounters, initKaru, initSteps, initCardHeat } from "./ui/reveal.js";
import { initLightbox } from "./ui/lightbox.js";

const html = document.documentElement;

/* ---------- content wiring ---------- */
document.querySelectorAll("[data-wa]").forEach((a) => { a.href = waLink(); });
document.querySelectorAll("[data-wa-number]").forEach((el) => { el.textContent = waPretty(); });
const year = document.getElementById("year");
if (year) year.textContent = String(Math.max(2026, new Date().getFullYear()));
if (/^5950+$/.test(CONFIG.whatsapp)) console.info("[Ardentium] Configurá tu número de WhatsApp en src/config.js");

/* ---------- hero: molten ground (WebGL) + sparks ---------- */
const hero = document.getElementById("top");
const forge = new Forge(document.getElementById("forge"));
if (forge.ok) html.classList.add("gl-ready");
forge.onfail = () => html.classList.remove("gl-ready");

let heroVisible = true;
watchVisible(hero, (v) => { heroVisible = v; if (v) wake(); });

const sparks = state.reduced ? null : new Sparks(document.getElementById("sparks"));
if (sparks && state.pointerFine) {
  // a few embers rise off the forge mouth while the hero is on screen (desktop only)
  let acc = 0;
  sparks.addEmitter((dt, sp) => {
    if (!heroVisible) return false;
    const r = hero.getBoundingClientRect();
    acc += dt * 4;
    while (acc > 1) { acc--; sp.ember(state.vw * (0.5 + (Math.random() + Math.random() - 1) * 0.42), Math.min(state.vh, r.bottom) - 10 - Math.random() * 60); }
    return true;
  });
}

/* ---------- pointer: heat + hammer (hero only) ---------- */
const inHero = (y) => {
  if (!heroVisible) return false;
  const r = hero.getBoundingClientRect();
  return y >= r.top && y <= r.bottom;
};
if (forge.ok && state.pointerFine) {
  hero.addEventListener("pointermove", (e) => forge.pointer(e.clientX, e.clientY), { passive: true });
}
const strike = (x, y) => {
  if (!inHero(y)) return;
  if (forge.ok) forge.hammer(x, y);
  if (sparks) sparks.burst(x, y, 40, 1);
  wake();
};
// touch: a finger going down is usually the start of a scroll, so only a real tap strikes
let tap = null;
hero.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || e.target.closest("a, button")) return;
  if (e.pointerType === "mouse") { strike(e.clientX, e.clientY); return; }
  tap = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, sy: scrollY };
}, { passive: true });
hero.addEventListener("pointerup", (e) => {
  const t = tap;
  tap = null;
  if (!t || t.id !== e.pointerId) return;
  if (e.timeStamp - t.t > 300 || Math.hypot(e.clientX - t.x, e.clientY - t.y) > 10 || scrollY !== t.sy) return;
  strike(e.clientX, e.clientY);
}, { passive: true });

/* ---------- the loop ---------- */
onTick((s) => {
  const a = forge.ok && heroVisible ? forge.render(s) : false;
  const b = sparks ? sparks.tick(s) : false;
  return a || b;
});

/* ---------- page ---------- */
initNav();
initReveal();
initCounters();
initKaru();
initSteps();
initCardHeat();
initLightbox();

// the hero lands: its parts fade up (CSS) and the incandescent edge runs once through "vanguardia"
requestAnimationFrame(() => html.classList.add("is-ready"));
