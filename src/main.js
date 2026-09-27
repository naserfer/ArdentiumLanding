/**
 * ARDENTIUM · landing
 * Zero runtime dependencies: raw WebGL, a 2D particle system and one shared rAF loop.
 */
import { CONFIG, waLink, waPretty } from "./config.js";
import { state, onTick, watchVisible } from "./fx/ticker.js";
import { Forge } from "./fx/forge-gl.js";
import { Sparks } from "./fx/sparks.js";
import { initCursor } from "./fx/cursor.js";
import { runPreloader } from "./fx/preloader.js";
import { initScrollFx } from "./fx/scroll.js";
import { initReveal, initForgeHeadings } from "./fx/reveal.js";
import { initMagnetic, initScramble, initTilt, initSpot, initCounters, initTouchHeat } from "./fx/interact.js";
import { initLightbox } from "./fx/lightbox.js";
import { initFooterGiant } from "./fx/footer.js";

window.__ardentium = true;
const html = document.documentElement;

/* ---------- content wiring ---------- */
document.querySelectorAll("[data-wa]").forEach((a) => { a.href = waLink(); });
document.querySelectorAll("[data-wa-number]").forEach((el) => { el.textContent = waPretty(); });
const year = document.getElementById("year");
if (year) year.textContent = String(Math.max(2026, new Date().getFullYear()));
if (/^5950+$/.test(CONFIG.whatsapp)) console.info("[Ardentium] Configurá tu número de WhatsApp en src/config.js");

/* ---------- hero intro state (hidden behind the furnace doors) ---------- */
const heroItems = [...document.querySelectorAll(".hero [data-reveal], .hero__eyebrow, .hero__meta")];
if (!state.reduced && html.classList.contains("is-loading")) heroItems.forEach((el) => el.classList.add("is-pending"));

/* ---------- WebGL forge (hero + contact) ---------- */
const hero = document.getElementById("top");
const forge = new Forge(document.getElementById("forge"), { textEl: document.getElementById("heroMark"), text: "ARDENTIUM" });
const forge2 = new Forge(document.getElementById("forge2"), { base: 0.82 });
if (forge.ok) html.classList.add("gl-ready");
if (document.fonts) document.fonts.ready.then(() => forge.drawText());

/* ---------- sparks ---------- */
const sparks = state.reduced ? null : new Sparks(document.getElementById("sparks"));
if (sparks) {
  // embers rising off the molten floor while the hero is on screen
  let heroVisible = true;
  watchVisible(hero, (v) => { heroVisible = v; });
  let acc = 0;
  sparks.addEmitter((dt, sp) => {
    if (!heroVisible) return;
    const r = hero.getBoundingClientRect();
    acc += dt * (state.mobile ? 10 : 26);
    while (acc > 1) { acc--; sp.ember(Math.random() * innerWidth, Math.min(innerHeight, r.bottom) - 10 - Math.random() * 60); }
  });
  // a faint trail when the cursor moves fast
  if (state.pointerFine) {
    sparks.addEmitter((dt, sp) => {
      const v = Math.hypot(state.mouseVX, state.mouseVY);
      if (v < 18 || Math.random() > 0.55) return;
      sp.spawn({ x: state.mouseX, y: state.mouseY, vx: -state.mouseVX * 6 + (Math.random() - 0.5) * 80, vy: -state.mouseVY * 6 - Math.random() * 120, max: 0.35 + Math.random() * 0.4, size: 0.8 + Math.random() });
    });
  }
}

/* ---------- pointer: heat + hammer ---------- */
addEventListener("pointermove", (e) => {
  if (!forge.ok) return;
  const r = hero.getBoundingClientRect();
  if (e.clientY >= r.top && e.clientY <= r.bottom) forge.pointer(e.clientX, e.clientY);
  const c = forge2.canvas.getBoundingClientRect();
  if (forge2.ok && e.clientY >= c.top && e.clientY <= c.bottom) forge2.pointer(e.clientX, e.clientY);
}, { passive: true });

addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || e.target.closest("a, button, input, textarea, select, label")) return;
  const r = hero.getBoundingClientRect();
  const inHero = e.clientY >= r.top && e.clientY <= r.bottom;
  const c = forge2.canvas.getBoundingClientRect();
  const inCta = e.clientY >= c.top && e.clientY <= c.bottom;
  if (inHero) forge.hammer(e.clientX, e.clientY);
  if (inCta) forge2.hammer(e.clientX, e.clientY);
  if (sparks) sparks.burst(e.clientX, e.clientY, inHero || inCta ? 46 : 18, inHero || inCta ? 1 : 0.6);
  if (inHero && !state.reduced) {
    hero.classList.remove("is-shake"); void hero.offsetWidth; hero.classList.add("is-shake");
  }
});

// molten buttons throw a few sparks on hover
if (sparks && state.pointerFine) {
  document.querySelectorAll(".btn--molten").forEach((b) => b.addEventListener("pointerenter", () => {
    const r = b.getBoundingClientRect();
    sparks.line(r.left + 10, r.right - 10, r.top + 2, 10);
  }));
}

/* ---------- interactions ---------- */
initMagnetic();
initScramble();
initTilt();
initSpot();
initCounters();
initTouchHeat();
initLightbox();
const giantTick = initFooterGiant();
initReveal();
initForgeHeadings(sparks);
const cursorTick = initCursor();
const scrollTick = initScrollFx();

/* ---------- the loop ---------- */
const cta = document.getElementById("contacto");
onTick((s) => {
  if (forge.ok) forge.render(s);
  if (forge2.ok) {
    // the contact furnace heats up as you approach it
    const r = cta.getBoundingClientRect();
    const k = Math.min(1, Math.max(0, (s.vh - r.top) / (s.vh * 0.95)));
    forge2.opts.base = 0.42 + 0.58 * k * k * (3 - 2 * k);
    forge2.render(s);
  }
  if (giantTick) giantTick(s);
  if (sparks) sparks.tick(s);
  if (cursorTick) cursorTick(s);
  scrollTick(s);
});

/* ---------- intro ---------- */
runPreloader().then(() => {
  heroItems.forEach((el, i) => {
    el.style.setProperty("--d", `${0.15 + i * 0.07}s`);
    el.classList.add("is-in");
    el.classList.remove("is-pending");
    setTimeout(() => el.classList.remove("is-in"), 1600 + i * 90);
  });
  // pour the metal into the wordmark, left to right
  if (state.reduced) { forge.ignite = 1; forge.still = false; return; }
  const start = performance.now();
  const pour = (now) => {
    const p = Math.min(1, (now - start) / 1700);
    forge.ignite = 1 - Math.pow(1 - p, 3);
    if (p < 1) requestAnimationFrame(pour);
    else if (sparks) {
      const r = document.getElementById("heroMark").getBoundingClientRect();
      sparks.line(r.left, r.right, r.bottom - r.height * 0.1, state.mobile ? 24 : 60);
    }
  };
  requestAnimationFrame(pour);
});
