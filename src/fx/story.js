/**
 * Scroll story. Two modes:
 *   html.ch-on  depth journey: each section is a chamber you enter (the chamber motion itself is
 *               CSS scroll-driven, see main.css). Here: chamber bookkeeping (stacking, heights, the
 *               hero's dive origin) and the choreography *inside* chambers, scrubbed by ScrollTrigger.
 *   otherwise   (no scroll-driven animations, e.g. Firefox) a plain scroll with depth entrances.
 * ScrollTriggers only ever use sections as triggers: elements inside chambers are transformed by
 * the chamber animation, so their measured boxes would be wrong.
 *
 * Contexts (gsap.matchMedia): fine = mouse + motion allowed; reduced = simple fades;
 * touch gets opacity and colour only (nothing it scrubs moves).
 */
import { gsap, ScrollTrigger } from "./gsap.js";

export const FINE_Q = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const REDUCED_Q = "(prefers-reduced-motion: reduce)";
/** centre of the bowl of the italic "d", as a fraction of the glyph's inline box */
const DOOR_X = 0.5, DOOR_Y = 0.52;
/** same, for the upright "d" of the "Ad" tile */
const LAND_X = 0.42, LAND_Y = 0.6;

const html = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/** will-change only while the trigger is active */
const hint = (els, props = "transform, opacity") => (self) => {
  for (const el of els) if (el) el.style.willChange = self.isActive ? props : "";
};

/** Splits each manifesto phrase into word spans that carry --heat (0 ash → .5 ember → 1 bone). */
function splitManifesto(man) {
  for (const ph of $$(".ph", man)) {
    const words = ph.textContent.trim().split(/\s+/);
    ph.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(" ");
  }
  return $$(".w", man);
}

/** offset of el inside ancestor, ignoring transforms */
function offsetIn(el, ancestor) {
  let x = 0, y = 0, n = el;
  while (n && n !== ancestor) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  return { x, y };
}

function initChambers() {
  const chambers = $$(".ch").filter((c) => c.offsetParent);
  const n = Math.max(1, chambers.length - 1);
  chambers.forEach((c, i) => {
    // earlier chambers fly past the camera in front of the ones arriving behind them
    c.style.setProperty("--z", String(29 - i));
    c.dataset.story = "";
    // arrival temperature: cold steel (blue-grey) → red heat → white heat
    const t = i / n;
    const u = Math.min(1, t / 0.5), w = Math.max(0, (t - 0.5) / 0.5);
    const hue = t < 0.5 ? 180 - u * 198 : -18 + w * 12;
    const sep = t < 0.5 ? 0.4 + u * 0.6 : 1;
    const sat = t < 0.5 ? 0.5 + u * 3.7 : 4.2 - w * 2.4;
    const bri = t < 0.5 ? 0.5 + u * 0.1 : 0.6 + w * 1.7;
    c.style.setProperty("--hue", `${hue.toFixed(1)}deg`);
    c.style.setProperty("--sep", sep.toFixed(2));
    c.style.setProperty("--sat", sat.toFixed(2));
    c.style.setProperty("--bri", bri.toFixed(2));
  });
  const views = $$(".ch__view");
  const measure = () => views.forEach((v) => v.style.setProperty("--vh-h", `${v.offsetHeight}px`));
  measure();
  new ResizeObserver(measure).observe(document.body);

  // the hero is entered through the counter (the closed bowl) of the "d" of "vanguardia"
  const hero = $("#top"), door = $("#heroTitle .hero__door") || $("#heroTitle em");
  const dive = () => {
    const o = offsetIn(door, hero);
    const cx = o.x + door.offsetWidth * DOOR_X, cy = o.y + door.offsetHeight * DOOR_Y;
    for (const el of $$(":scope > .hero__gl, :scope > .hero__inner", hero)) {
      const b = offsetIn(el, hero);
      el.style.setProperty("--dive-x", `${cx - b.x}px`);
      el.style.setProperty("--dive-y", `${cy - b.y}px`);
    }
  };
  // ...and comes out of the bowl of the "d" of "Ad", in the name chamber
  const landView = $("#nombre .ch__view"), landDoor = $("#nombre .tile__door");
  const land = () => {
    if (!landView || !landDoor) return;
    const o = offsetIn(landDoor, landView);
    landView.style.setProperty("--land-x", `${o.x + landDoor.offsetWidth * LAND_X}px`);
    landView.style.setProperty("--land-y", `${o.y + landDoor.offsetHeight * LAND_Y}px`);
  };
  const place = () => { dive(); land(); };
  place();
  addEventListener("resize", place, { passive: true });
  if (document.fonts) document.fonts.ready.then(place);

  for (const h of $$(".ch [data-forge]")) forgeLetters(h);
}

/** Splits a title into letters scattered like raw ore; the chamber's arrival hammers them home. */
function forgeLetters(h) {
  const text = h.textContent.trim().replace(/\s+/g, " ");
  const r = (a) => (Math.random() - 0.5) * a;
  h.setAttribute("aria-label", text);
  h.innerHTML = text.split(" ").map((w) => `<span class="fw" aria-hidden="true">${[...w].map((c) =>
    `<span class="fc" style="--dx:${r(1.4).toFixed(2)}em;--dy:${r(1.8).toFixed(2)}em;--r:${r(80).toFixed(0)}deg;--s:${(0.55 + Math.random() * 0.9).toFixed(2)}">${c}</span>`
  ).join("")}</span>`).join(" ");
}

export function initStory() {
  const chamber = html.classList.contains("ch-on");
  const man = $("#manifesto");
  const words = man && !matchMedia(REDUCED_Q).matches ? splitManifesto(man) : [];
  html.classList.add("st-live");
  if (chamber) initChambers();

  const mm = gsap.matchMedia();
  // "any" always matches: matchMedia only runs the callback when at least one condition does
  mm.add({ any: "all", fine: FINE_Q, reduced: REDUCED_Q }, (ctx) => {
    const { fine, reduced } = ctx.conditions;

    if (reduced) {
      ScrollTrigger.batch(".sec-head, .card, .case__info, .karu, .screens, .steps, .founders, .cta__inner", {
        once: true, start: "top 92%",
        onEnter: (els) => gsap.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.06, ease: "power1.out", overwrite: true }),
      });
      return;
    }

    /* ---------- el nombre ---------- */
    const name = $("#nombre");
    if (chamber && name) {
      // the chamber holds still; the three phrases take turns inside it (touch: opacity + heat only)
      const phrases = $$(".ph", man), rule = $(".name__rule", name), tileWrap = $(".name__tile-wrap", name);
      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: { trigger: name, start: "top top", end: "bottom bottom", scrub: fine ? 0.8 : true, onToggle: fine ? hint([...phrases, tileWrap]) : undefined },
      });
      const depthIn = fine ? { scale: 0.72, y: 40 } : {}, depthHold = fine ? { scale: 1, y: 0 } : {};
      const depthOut = fine ? { scale: 1.12 } : {};
      const beats = [{ at: 0, d: 0, out: 2.8 }, { at: 3.2, d: 1, out: 5.8 }, { at: 6.2, d: 1 }];
      if (fine) tl.fromTo(tileWrap, { y: "8vh" }, { y: "-8vh", ease: "none", duration: 10 }, 0);
      phrases.forEach((ph, i) => {
        const b = beats[Math.min(i, beats.length - 1)];
        if (b.d) tl.fromTo(ph, { opacity: 0, ...depthIn }, { opacity: 1, ...depthHold, duration: b.d }, b.at);
        tl.fromTo($$(".w", ph), { "--heat": 0 }, { "--heat": 1, duration: 0.7, stagger: 0.07, ease: "none" }, b.at + b.d * 0.5 + 0.1);
        if (b.out) tl.to(ph, { opacity: 0, ...depthOut, duration: 0.8, ease: "power2.in" }, b.out);
      });
      tl.fromTo(rule, { opacity: 0 }, { opacity: 1, duration: 0.8 }, 7.6);
      tl.to({}, { duration: 1.6 }, 8.4);
    } else if (words.length) {
      gsap.fromTo(words, { "--heat": 0 }, {
        "--heat": 1, ease: "none", stagger: 0.12,
        scrollTrigger: { trigger: man, start: "top 88%", end: "bottom 45%", scrub: fine ? 0.6 : true },
      });
    }

    if (!fine) return;

    /* ---------- servicios: the four cards arrive a beat behind their chamber, from deeper still ---------- */
    const services = $("#servicios");
    const cards = $$(".cards .card");
    cards.forEach((c) => { c.dataset.story = ""; });
    const cardTl = gsap.timeline({
      defaults: { ease: "power2.out" },
      scrollTrigger: chamber
        ? { trigger: services, start: "top bottom", end: "top top", scrub: 0.6, onToggle: hint(cards) }
        : { trigger: $(".cards"), start: "top 95%", end: "top 45%", scrub: 0.8, onToggle: hint(cards) },
    });
    cards.forEach((card, i) => {
      const at = i * 0.12;
      cardTl
        .fromTo(card, { opacity: 0, y: 110, scale: 0.86, rotateX: 14, transformOrigin: "50% 100%" }, { opacity: 1, y: 0, scale: 1, rotateX: 0, duration: 0.64 }, at)
        .fromTo($(".card__ico", card), { y: 60 }, { y: 0, duration: 0.64 }, at)
        .fromTo($(".card__title", card), { y: 30 }, { y: 0, duration: 0.64 }, at)
        .fromTo($(".alloy", card), { y: 18 }, { y: 0, duration: 0.64 }, at);
    });

    /* ---------- trabajos: inside each chamber the parts sit on their own planes ---------- */
    $$(".case").forEach((caseEl) => {
      const stage = $(".karu, .screens", caseEl), bg = $(".case__bg", caseEl), fast = $(".karu__steps", caseEl);
      if (!chamber) {
        const parts = $$(".case__info > *", caseEl);
        parts.forEach((p) => { p.dataset.story = ""; });
        gsap.fromTo(parts, { opacity: 0, y: 40 }, {
          opacity: 1, y: 0, ease: "power2.out", stagger: 0.08,
          scrollTrigger: { trigger: caseEl, start: "top 80%", end: "top 20%", scrub: 0.6, onToggle: hint(parts) },
        });
        return;
      }
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: caseEl, start: "top bottom", end: "bottom top", scrub: 0.8, onToggle: hint([stage, bg, fast]) },
      });
      if (bg) tl.fromTo(bg, { yPercent: 40 }, { yPercent: -40, duration: 1 }, 0);
      tl.fromTo(stage, { y: 80 }, { y: -80, duration: 1 }, 0);
      if (fast) tl.fromTo(fast, { y: 60 }, { y: -40, duration: 1 }, 0);
    });

    /* ---------- no chambers: the hero recedes instead of being dived into ---------- */
    if (!chamber) {
      const head = $(".hero__head"), foot = $(".hero__foot"), gl = $("#forge");
      gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: "#top", start: "top top", end: "bottom top", scrub: 0.6, onToggle: hint([head, foot, gl]) },
      })
        .to(head, { scale: 0.82, opacity: 0, yPercent: -14 }, 0)
        .to(".hero__eyebrow", { opacity: 0, y: -24, duration: 0.4 }, 0)
        .to(foot, { y: -70 }, 0)
        .to(gl, { yPercent: 30, scale: 1.1 }, 0);
    }
  });

  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  return mm;
}
