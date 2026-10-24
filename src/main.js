/**
 * ARDENTIUM · landing
 * Zero runtime dependencies: raw WebGL, a 2D particle system and one shared rAF loop.
 */
import { CONFIG, waLink, waPretty } from "./config.js";
import { state, onTick, onRead, watchVisible, lerp, trackRect } from "./fx/ticker.js";
import { Forge } from "./fx/forge-gl.js";
import { HERO_FRAG } from "./fx/hero-ground.js";
import { Sparks } from "./fx/sparks.js";
import { initCursor } from "./fx/cursor.js";
import { runPreloader } from "./fx/preloader.js";
import { initScrollFx } from "./fx/scroll.js";
import { initReveal, initForgeHeadings } from "./fx/reveal.js";
import { initStory } from "./fx/story.js";
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
const heroItems = [...document.querySelectorAll(".hero__eyebrow, .hero [data-reveal], .hero__meta")];
const heroTitle = document.getElementById("heroTitle");
const heroEm = heroTitle.querySelector("em");

/* ---------- WebGL forge (hero + contact) ---------- */
const hero = document.getElementById("top");
// while the intro runs, its own shader compiles first; the field follows once the intro is on screen
const introAhead = !state.reduced && html.classList.contains("is-loading");
const forge = new Forge(document.getElementById("forge"), {
  lazy: introAhead, frag: HERO_FRAG, quality: state.mobile ? 0.6 : 0.8, wander: false,
});
const forge2 = new Forge(document.getElementById("forge2"), { base: 0.82, lazy: "near" });
if (forge.ok) html.classList.add("gl-ready");
forge.onfail = () => html.classList.remove("gl-ready");
/* ---------- sparks ---------- */
const sparks = state.reduced ? null : new Sparks(document.getElementById("sparks"));
if (sparks) {
  // (detail) a few embers rise off the forge mouth while the hero is on screen — never during the intro
  let acc = 0;
  sparks.addEmitter((dt, sp) => {
    if (!heroVisible || intro) return;
    acc += dt * (state.mobile ? 2.5 : 5);
    while (acc > 1) { acc--; sp.ember(state.vw * (0.5 + (Math.random() + Math.random() - 1) * 0.42), Math.min(state.vh, heroRect.bottom) - 10 - Math.random() * 60); }
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

const strike = (x, y, shake) => {
  const inHero = heroVisible && y >= heroRect.top && y <= heroRect.bottom;
  const inCta = !!ctaRect && y >= ctaRect.top && y <= ctaRect.bottom;
  if (inHero) forge.hammer(x, y);
  if (inCta && forge2.ok) forge2.hammer(x, y);
  if (sparks) sparks.burst(x, y, inHero || inCta ? 46 : 18, inHero || inCta ? 1 : 0.6);
  if (shake && inHero && !state.reduced) {
    hero.classList.remove("is-shake"); void hero.offsetWidth; hero.classList.add("is-shake");
  }
};

// touch: a finger going down is usually the start of a scroll, so only a real tap (short, still,
// page not scrolled) strikes, and it never shakes the screen
let tap = null;
addEventListener("pointerdown", (e) => {
  if (intro || e.button !== 0 || e.target.closest("a, button, input, textarea, select, label")) return;
  if (e.pointerType === "mouse") { strike(e.clientX, e.clientY, true); return; }
  tap = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, sy: scrollY };
}, { passive: true });
addEventListener("pointerup", (e) => {
  const t = tap;
  tap = null;
  if (!t || t.id !== e.pointerId || intro) return;
  if (e.timeStamp - t.t > 300 || Math.hypot(e.clientX - t.x, e.clientY - t.y) > 10 || scrollY !== t.sy) return;
  strike(e.clientX, e.clientY, false);
}, { passive: true });
addEventListener("pointercancel", () => { tap = null; }, { passive: true });

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
try { initStory(); } catch (err) {
  // without the story layer every section is still complete and in order
  document.documentElement.classList.remove("st-pin", "st-live");
  console.error(err);
}
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
  };
})();

/* ---------- the incandescent edge of "vanguardia" follows the cursor ---------- */
const titleLight = (() => {
  if (!state.pointerFine || state.reduced) return null;
  const box = trackRect(heroEm);
  let lx = -1, ly = -1;
  return (s) => {
    if (!heroVisible || (s.mouseX === lx && s.mouseY === ly)) return;
    lx = s.mouseX; ly = s.mouseY;
    heroEm.style.setProperty("--hx", `${(lx - box.left).toFixed(1)}px`);
    heroEm.style.setProperty("--hy", `${(ly - box.top).toFixed(1)}px`);
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
  if (titleLight) titleLight(s);
  if (giantTick) giantTick(s);
  if (sparks) sparks.tick(s);
  if (cursorTick) cursorTick(s);
  scrollTick(s);
});

/* ---------- intro: the forge comes alive, then the hero is revealed behind its heat front ---------- */
runPreloader({ forge: forge.ok ? forge : null, sparks }).then((show) => {
  intro = false;
  show.sweep(heroItems);
  if (state.reduced) return;
  // the h1 lands: the incandescent edge runs once through "vanguardia"
  heroTitle.classList.add("is-lit");
  if (sparks) {
    setTimeout(() => {
      const r = heroEm.getBoundingClientRect();
      sparks.line(r.left, r.right, r.bottom - r.height * 0.18, state.mobile ? 10 : 24);
    }, 900);
  }
});
