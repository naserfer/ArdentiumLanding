/**
 * Scroll reveals. Content that is already on screen when the page boots is never hidden;
 * only elements that start below the fold get armed, so the page is complete at rest.
 * Reveals are grouped by block: a block (its parent) entering the screen brings in all of its
 * parts together, with a short stagger — never element by element.
 * Project stages (KarúBox, the capture stacks) are uncovered by geometric cuts instead of a fade,
 * in step with their 3D fan‑out; captures are only clipped, never scaled or distorted.
 * Display headings marked [data-forge] get "hammered": they arrive narrow and cold,
 * then stretch to full width while cooling from white‑hot, throwing sparks.
 */
import { state } from "./ticker.js";

const AUTO = [
  ".sec-head > *:not([data-forge])",
  ".name__tile-wrap",
  ".name__text > *",
  ".card",
  ".case__info > *",
  ".step",
  ".founder",
  ".team__stat",
  ".cta__inner > *:not([data-forge])",
  ".foot > *",
];

/** Stages uncovered by a cut instead of a fade (the cut itself lives in CSS: .is-cutting / .is-cut). */
const CUTS = [".karu", ".case .screens"];

const below = (el) => el.getBoundingClientRect().top >= innerHeight;

export function initReveal() {
  if (state.reduced || !("IntersectionObserver" in window)) return;
  const els = new Set(document.querySelectorAll("[data-reveal]"));
  AUTO.forEach((sel) => document.querySelectorAll(sel).forEach((el) => els.add(el)));

  // block → its armed parts
  const groups = new Map();
  els.forEach((el) => {
    // the hero is revealed by the intro sequence; [data-story] elements are scrubbed by story.js
    if (el.closest(".hero, [data-story]") || !below(el)) return;
    const block = el.parentElement;
    if (!groups.has(block)) groups.set(block, []);
    groups.get(block).push(el);
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const parts = groups.get(e.target) || [e.target];
      parts.forEach((el) => {
        el.classList.add("is-in");
        el.classList.remove("is-pending");
        // hand the element back to its own transitions once the entrance is done
        const delay = parseFloat(el.style.getPropertyValue("--d")) || 0;
        setTimeout(() => el.classList.remove("is-in"), 1300 + delay * 1000);
      });
    });
  }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });

  groups.forEach((parts, block) => {
    parts.forEach((el, i) => {
      el.style.setProperty("--d", `${Math.min(i, 5) * 0.07}s`);
      el.classList.add("is-pending");
    });
    io.observe(block);
  });

  /* ---------- geometric cuts for the project stages ---------- */
  const cut = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      cut.unobserve(e.target);
      e.target.classList.add("is-cut");
      setTimeout(() => e.target.classList.remove("is-cutting", "is-cut"), 1700);
    });
  // threshold 0: a stage that starts fully clipped reports an intersection ratio of 0, never 0.12
  }, { threshold: 0, rootMargin: "0px 0px -15% 0px" });
  CUTS.forEach((sel) => document.querySelectorAll(sel).forEach((el) => {
    if (!below(el)) return;
    el.classList.add("is-cutting");
    cut.observe(el);
  }));
}

export function initForgeHeadings(sparks) {
  if (state.reduced || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target;
      el.classList.remove("is-cold");
      el.classList.add("is-struck");
      if (sparks) {
        setTimeout(() => {
          const r = el.getBoundingClientRect();
          sparks.line(r.left, r.left + Math.min(r.width, innerWidth - r.left), r.top + r.height * 0.8, state.mobile ? 18 : 40);
        }, 120);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll("[data-forge]").forEach((el) => {
    if (el.getBoundingClientRect().top < innerHeight) return;
    el.classList.add("is-cold");
    io.observe(el);
  });
}
