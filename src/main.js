/**
 * ARDENTIUM · landing
 * Zero runtime dependencies: raw WebGL, a 2D particle system and one shared rAF loop.
 */
import { CONFIG, waLink, waPretty } from "./config.js";
import { state, onTick, onRead, watchVisible, lerp, trackRect } from "./fx/ticker.js";
import { Forge } from "./fx/forge-gl.js";
import { Sparks } from "./fx/sparks.js";
import { initCursor } from "./fx/cursor.js";
import { runPreloader } from "./fx/preloader.js";
import { initScrollFx } from "./fx/scroll.js";
import { initReveal, initForgeHeadings } from "./fx/reveal.js";
import { initMagnetic, initScramble, initTilt, initSpot, initCounters, initTouchHeat, initOffscreenPause } from "./fx/interact.js";
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

/* ---------- hero items: painted at first paint (under the intro), revealed by its heat front ---------- */
const heroItems = [...document.querySelectorAll(".hero__eyebrow, .hero__mark, .hero [data-reveal], .hero__meta")];

/* ---------- WebGL forge (hero + contact) ---------- */
const hero = document.getElementById("top");
// while the intro runs, its own shader compiles first; the field follows once the intro is on screen
const introAhead = !state.reduced && html.classList.contains("is-loading");
const forge = new Forge(document.getElementById("forge"), { textEl: document.getElementById("heroMark"), text: "ARDENTIUM", lazy: introAhead });
const forge2 = new Forge(document.getElementById("forge2"), { base: 0.82, lazy: "near" });
if (forge.ok) html.classList.add("gl-ready");
forge.onfail = () => html.classList.remove("gl-ready");
// repaint the wordmark with the real face once it loads (during the intro, the intro asks for it)
if (document.fonts) document.fonts.ready.then(() => { if (!forge.opts.lazy || forge.textReady) forge.drawText(); });

/* ---------- sparks ---------- */
const sparks = state.reduced ? null : new Sparks(document.getElementById("sparks"));
if (sparks) {
  // embers rising off the molten floor while the hero is on screen
  // (detail) a few embers rise off the molten floor while the hero is on screen — never during the intro
  let acc = 0;
  sparks.addEmitter((dt, sp) => {
    if (!heroVisible || intro) return;
    acc += dt * (state.mobile ? 8 : 16);
    while (acc > 1) { acc--; sp.ember(Math.random() * state.vw, Math.min(state.vh, heroRect.bottom) - 10 - Math.random() * 60); }
  });
  // (detail) a faint trail only when the cursor moves fast
  if (state.pointerFine) {
    sparks.addEmitter((dt, sp) => {
      const v = Math.hypot(state.mouseVX, state.mouseVY);
      if (intro || v < 26 || Math.random() > 0.35) return;
      sp.spawn({ x: state.mouseX, y: state.mouseY, vx: -state.mouseVX * 6 + (Math.random() - 0.5) * 80, vy: -state.mouseVY * 6 - Math.random() * 120, max: 0.35 + Math.random() * 0.4, size: 0.8 + Math.random() });
    });
  }
}

/* ---------- layout reads for this frame (the ticker runs these before any write) ---------- */
let intro = !state.reduced && html.classList.contains("is-loading");
let heroVisible = true;
watchVisible(hero, (v) => { heroVisible = v; });
const heroRect = trackRect(hero);
const ctaBox = trackRect(document.getElementById("contacto"));
let ctaRect = null;
onRead(() => { ctaRect = forge2.ok && forge2.visible ? ctaBox : null; });

/* ---------- pointer: heat + hammer ---------- */
addEventListener("pointermove", (e) => {
  if (!forge.ok) return;
  if (heroVisible && e.clientY >= heroRect.top && e.clientY <= heroRect.bottom) forge.pointer(e.clientX, e.clientY);
  if (ctaRect && e.clientY >= ctaRect.top && e.clientY <= ctaRect.bottom) forge2.pointer(e.clientX, e.clientY);
}, { passive: true });

addEventListener("pointerdown", (e) => {
  if (intro || e.button !== 0 || e.target.closest("a, button, input, textarea, select, label")) return;
  const inHero = heroVisible && e.clientY >= heroRect.top && e.clientY <= heroRect.bottom;
  const inCta = !!ctaRect && e.clientY >= ctaRect.top && e.clientY <= ctaRect.bottom;
  if (inHero) forge.hammer(e.clientX, e.clientY);
  if (inCta && forge2.ok) forge2.hammer(e.clientX, e.clientY);
  if (sparks) sparks.burst(e.clientX, e.clientY, inHero || inCta ? 46 : 18, inHero || inCta ? 1 : 0.6);
  if (inHero && !state.reduced) {
    hero.classList.remove("is-shake"); void hero.offsetWidth; hero.classList.add("is-shake");
  }
});

// molten buttons throw a few sparks on hover
if (sparks && state.pointerFine) {
  document.querySelectorAll(".btn--molten").forEach((b) => b.addEventListener("pointerenter", () => {
    const r = b.getBoundingClientRect();
    sparks.line(r.left + 10, r.right - 10, r.top + 2, 6);
  }));
}

/* ---------- interactions ---------- */
initMagnetic();
initScramble();
initTilt();
initSpot();
initCounters();
initTouchHeat();
initOffscreenPause();
initLightbox();
const giantTick = initFooterGiant();
initReveal();
initForgeHeadings(sparks);
const cursorTick = initCursor();
const scrollTick = initScrollFx();

/* ---------- hero parallax: three depths, 8 px at most, fine pointers only ---------- */
const parallax = (() => {
  if (!state.pointerFine || state.reduced) return null;
  const layers = [[document.querySelector(".hero__eyebrow"), 3], [document.querySelector(".hero__foot"), 4], [document.querySelector(".hero__meta"), 2]];
  let px = 0, py = 0;
  return (s) => {
    if (!heroVisible || html.classList.contains("is-intro")) return;
    const tx = (s.mouseX / s.vw - 0.5) * 2, ty = (s.mouseY / s.vh - 0.5) * 2;
    if (Math.abs(tx - px) < 0.002 && Math.abs(ty - py) < 0.002) return;
    px = lerp(px, tx, 0.06); py = lerp(py, ty, 0.06);
    for (const [el, d] of layers) if (el) el.style.translate = `${(-px * d).toFixed(2)}px ${(-py * d).toFixed(2)}px`;
    // the wordmark is the deepest layer: it moves in the shader, against the field
    if (forge.ok) forge.par = [(px * 8) / Math.max(1, heroRect.width), (-py * 8) / Math.max(1, heroRect.height)];
  };
})();

/* ---------- the loop ---------- */
onTick((s) => {
  if (forge.ok) forge.render(s);
  if (ctaRect) {
    // the contact furnace heats up as you approach it
    const k = Math.min(1, Math.max(0, (s.vh - ctaRect.top) / (s.vh * 0.95)));
    forge2.opts.base = 0.42 + 0.58 * k * k * (3 - 2 * k);
    forge2.render(s);
  }
  if (parallax) parallax(s);
  if (giantTick) giantTick(s);
  if (sparks) sparks.tick(s);
  if (cursorTick) cursorTick(s);
  scrollTick(s);
});

/* ---------- intro: the forge comes alive, then the hero is revealed behind its heat front ---------- */
runPreloader({ forge: forge.ok ? forge : null, sparks }).then((show) => {
  intro = false;
  show.sweep(heroItems);
  // pour the metal into the wordmark, left to right
  if (state.reduced || !forge.ok) { forge.ignite = 1; forge.still = false; return; }
  show.pour(forge, () => {
    if (!sparks) return;
    const r = document.getElementById("heroMark").getBoundingClientRect();
    sparks.line(r.left, r.right, r.bottom - r.height * 0.1, state.mobile ? 24 : 60);
  });
});
