/**
 * Scrollytelling: GSAP timelines scrubbed by ScrollTrigger, on the shared gsap.ticker.
 * Pins are CSS position: sticky inside tall sections (html.st-pin), so the layout is real:
 * anchors land where they should, nothing is re-parented and a refresh mid-page never jumps.
 * ScrollTrigger only turns scroll position into timeline progress.
 *
 * Contexts (gsap.matchMedia):
 *   fine    mouse + motion allowed: depth entrances, hero exit, case layers
 *   pin     fine + a screen tall enough to hold a pinned stage (Nombre, Proceso)
 *   reduced simple fades, nothing pinned or moving in depth
 *   otherwise (touch) only colour is scrubbed; entrances are time‑based (reveal.js)
 */
import { gsap, ScrollTrigger } from "./gsap.js";

export const FINE_Q = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
export const PIN_Q = `${FINE_Q} and (min-width: 1024px) and (min-height: 760px)`;
const REDUCED_Q = "(prefers-reduced-motion: reduce)";

const html = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/** will-change only while the trigger is active */
const hint = (els, props = "transform, opacity") => (self) => {
  for (const el of els) el.style.willChange = self.isActive ? props : "";
};

/** Splits each manifesto phrase into word spans that carry --heat (0 ash → .5 ember → 1 bone). */
function splitManifesto(man) {
  for (const ph of $$(".ph", man)) {
    const words = ph.textContent.trim().split(/\s+/);
    ph.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(" ");
  }
  return $$(".w", man);
}

export function initStory() {
  const man = $("#manifesto");
  const words = man && !matchMedia(REDUCED_Q).matches ? splitManifesto(man) : [];
  const mm = gsap.matchMedia();
  html.classList.add("st-live");

  // "any" always matches: matchMedia only runs the callback when at least one condition does (touch matches none)
  mm.add({ any: "all", fine: FINE_Q, pin: PIN_Q, reduced: REDUCED_Q }, (ctx) => {
    const { fine, pin, reduced } = ctx.conditions;
    html.classList.toggle("st-pin", pin);

    if (reduced) {
      ScrollTrigger.batch(".sec-head, .card, .case__info, .karu, .screens, .steps, .founders, .cta__inner", {
        once: true, start: "top 92%",
        onEnter: (els) => gsap.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.06, ease: "power1.out", overwrite: true }),
      });
      return;
    }

    /* ---------- the manifesto heats word by word (colour only, so it is safe on touch too) ---------- */
    if (words.length && !pin) {
      gsap.fromTo(words, { "--heat": 0 }, {
        "--heat": 1, ease: "none", stagger: 0.12,
        scrollTrigger: { trigger: man, start: "top 88%", end: "bottom 45%", scrub: fine ? 0.6 : true },
      });
    }

    if (!fine) return;

    /* ---------- hero exit: the type recedes into the forge ---------- */
    const hero = $("#top");
    const head = $(".hero__head"), eyebrow = $(".hero__eyebrow"), foot = $(".hero__foot"), gl = $("#forge");
    gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.6, onToggle: hint([head, foot, gl]) },
    })
      .to(head, { scale: 0.82, opacity: 0, yPercent: -14 }, 0)
      .to(eyebrow, { opacity: 0, y: -24, duration: 0.4 }, 0)
      .to(foot, { y: -70 }, 0)
      .to(gl, { yPercent: 30, scale: 1.1 }, 0);

    /* ---------- servicios: the four cards emerge from depth, inner layers at their own speed ---------- */
    const cards = $$(".cards .card");
    const twoCols = matchMedia("(min-width: 761px)").matches;
    cards.forEach((card, i) => {
      card.dataset.story = "";
      const col = twoCols ? i % 2 : 0;
      const ico = $(".card__ico", card), title = $(".card__title", card), list = $(".alloy", card);
      gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: card, start: `top ${98 - col * 8}%`, end: `top ${58 - col * 8}%`, scrub: 0.8,
          onToggle: hint([card]),
        },
      })
        .fromTo(card, { opacity: 0, y: 120, scale: 0.9, rotateX: 10, transformOrigin: "50% 100%" }, { opacity: 1, y: 0, scale: 1, rotateX: 0 }, 0)
        .fromTo(ico, { y: 70 }, { y: 0 }, 0)
        .fromTo(title, { y: 36 }, { y: 0 }, 0)
        .fromTo(list, { y: 22 }, { y: 0 }, 0);
    });

    /* ---------- trabajos: info lands before the pin; the stage and its parts move on their own planes ---------- */
    $$(".case").forEach((caseEl) => {
      const parts = $$(".case__info > *", caseEl);
      parts.forEach((p) => { p.dataset.story = ""; });
      gsap.fromTo(parts, { opacity: 0, y: 40 }, {
        opacity: 1, y: 0, ease: "power2.out", stagger: 0.08,
        scrollTrigger: { trigger: caseEl, start: "top 80%", end: "top 20%", scrub: 0.6, onToggle: hint(parts) },
      });
      if (!pin) return;
      const stage = $(".karu, .screens", caseEl), bg = $(".case__bg", caseEl), fast = $(".karu__steps", caseEl);
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: caseEl, start: "top bottom", end: "bottom top", scrub: 0.8, onToggle: hint([stage, bg].filter(Boolean)) },
      });
      // the whole trigger spans the case height + 1 screen; the pin is the stretch in between
      if (bg) tl.fromTo(bg, { yPercent: 30 }, { yPercent: -30, duration: 1 }, 0);
      tl.fromTo(stage, { y: 90 }, { y: -90, duration: 1 }, 0);
      if (fast) tl.fromTo(fast, { y: 70 }, { y: -40, duration: 1 }, 0);
      // releasing the screen: the stage cools and steps back, the text stays put
      tl.to(stage, { scale: 0.94, opacity: 0.4, duration: 0.2, ease: "power1.in" }, 0.72);
    });

    if (!pin) return;

    /* ---------- el nombre: pinned; the manifesto arrives phrase by phrase from depth ---------- */
    const name = $("#nombre");
    const phrases = $$(".ph", man), rule = $(".name__rule", name), tileWrap = $(".name__tile-wrap", name);
    $(".name__stage", name).dataset.story = "";
    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
      scrollTrigger: { trigger: name, start: "top 60%", end: "bottom bottom", scrub: 0.8, onToggle: hint([...phrases, tileWrap]) },
    });
    // 10 units over the trigger; the first ~2 run while the section scrolls up, before the stage sticks,
    // so phrase 1 has landed by the time the screen holds still and heats up inside the pin
    const beats = [{ at: 0, d: 2, out: 3.6 }, { at: 4.2, d: 1, out: 6.4 }, { at: 7, d: 1 }];
    tl.fromTo(tileWrap, { y: "12vh" }, { y: "-12vh", ease: "none", duration: 10 }, 0);
    phrases.forEach((ph, i) => {
      const b = beats[Math.min(i, beats.length - 1)];
      tl.fromTo(ph, { opacity: 0, scale: 0.72, y: 40 }, { opacity: 1, scale: 1, y: 0, duration: b.d }, b.at);
      tl.fromTo($$(".w", ph), { "--heat": 0 }, { "--heat": 1, duration: 0.6, stagger: 0.06, ease: "none" }, b.at + b.d * 0.5);
      if (b.out) tl.to(ph, { opacity: 0, scale: 1.12, duration: 0.8, ease: "power2.in" }, b.out);
    });
    tl.fromTo(rule, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8 }, 8.4);
  });

  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  return mm;
}
