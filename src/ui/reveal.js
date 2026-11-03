/**
 * Everything that happens once, when a block scrolls into view: entrances, count-up numbers,
 * the KarúBox demo and the process rail. Plus the heat spot on the service cards.
 * Content that is already on screen at boot is never hidden, and with reduced motion nothing moves.
 */
import { state } from "../fx/loop.js";

const io = (cb, options) => ("IntersectionObserver" in window ? new IntersectionObserver(cb, options) : null);
const below = (el) => el.getBoundingClientRect().top >= innerHeight;
const motion = () => !state.reduced && "IntersectionObserver" in window;

/** [data-reveal] blocks fade up; siblings that arrive together get a short stagger. */
export function initReveal() {
  if (!motion()) return;
  const obs = io((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      obs.unobserve(e.target);
      e.target.classList.add("is-in");
    }
  }, { rootMargin: "0px 0px -8% 0px" });
  const order = new Map();
  document.querySelectorAll("[data-reveal]").forEach((el) => {
    if (!below(el)) return;
    const i = order.get(el.parentElement) || 0;
    order.set(el.parentElement, i + 1);
    el.style.setProperty("--d", `${Math.min(i, 5) * 0.08}s`);
    el.classList.add("is-pending");
    obs.observe(el);
  });
}

function countUp(el, to, ms = 1400, fmt = (v) => String(Math.round(v))) {
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    el.textContent = fmt(to * (1 - Math.pow(2, -10 * k)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Numbers count up the first time they scroll into view. */
export function initCounters() {
  if (!motion()) return;
  const obs = io((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      obs.unobserve(e.target);
      countUp(e.target, +e.target.dataset.count);
    }
  }, { threshold: 0.6 });
  document.querySelectorAll("[data-count]").forEach((el) => {
    if (below(el)) { el.textContent = "0"; obs.observe(el); }
  });
}

/** KarúBox: order → remote print → live sales, played once (CSS) when the demo comes into view. */
export function initKaru() {
  const karu = document.getElementById("karuStage");
  if (!karu || !motion() || !below(karu)) return;
  const sales = document.getElementById("karuSales");
  karu.classList.add("is-armed");
  const obs = io((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    obs.disconnect();
    karu.classList.add("is-play");
    if (sales) {
      const base = 3314000, add = 98000;
      const fmt = (v) => "Gs. " + Math.round((base + v) / 1000).toLocaleString("es-PY").replace(/,/g, ".") + ".000";
      sales.textContent = fmt(0);
      setTimeout(() => countUp(sales, add, 1600, fmt), 2400);
    }
  }, { rootMargin: "0px 0px -25% 0px" });
  obs.observe(karu);
}

/** Process: each step lights up as it reaches the middle of the screen; the rail fills behind it. */
export function initSteps() {
  const steps = document.getElementById("steps");
  if (!steps || !motion()) return;
  const items = [...steps.querySelectorAll(".step")];
  steps.classList.add("is-armed");
  const lit = new Set();
  const obs = io((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      obs.unobserve(e.target);
      e.target.classList.add("is-lit");
      lit.add(e.target);
    }
    const last = Math.max(-1, ...[...lit].map((el) => items.indexOf(el)));
    steps.style.setProperty("--p", String((last + 1) / items.length));
  }, { rootMargin: "0px 0px -42% 0px" });
  items.forEach((el) => obs.observe(el));
}

/** Service cards: a heat spot follows the cursor; on touch, a card warms while it crosses the middle. */
export function initCardHeat() {
  const cards = document.querySelectorAll("[data-spot]");
  if (state.pointerFine) {
    cards.forEach((el) => el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    }));
    return;
  }
  const obs = io((entries) => {
    for (const e of entries) e.target.classList.toggle("is-hot", e.isIntersecting);
  }, { rootMargin: "-38% 0px -38% 0px" });
  if (obs) cards.forEach((el) => obs.observe(el));
}
