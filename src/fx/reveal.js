/**
 * Scroll reveals. Content that is already on screen when the page boots is never hidden;
 * only elements that start below the fold get armed, so the page is complete at rest.
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
  ".karu",
  ".screens",
  ".step",
  ".cta__inner > *:not([data-forge])",
  ".foot > *",
];

export function initReveal() {
  if (state.reduced || !("IntersectionObserver" in window)) return;
  const els = new Set(document.querySelectorAll("[data-reveal]"));
  AUTO.forEach((sel) => document.querySelectorAll(sel).forEach((el) => els.add(el)));

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      io.unobserve(el);
      el.classList.add("is-in");
      el.classList.remove("is-pending");
      // hand the element back to its own transitions once the entrance is done
      const delay = parseFloat(el.style.getPropertyValue("--d")) || 0;
      setTimeout(() => el.classList.remove("is-in"), 1100 + delay * 1000);
    });
  }, { threshold: 0.01, rootMargin: "0px 0px 6% 0px" }); // fire just before entering: no black gaps on fast scroll

  els.forEach((el) => {
    if (el.closest(".hero")) return; // the hero is revealed by the intro sequence
    if (el.getBoundingClientRect().top < innerHeight) return;
    // stagger siblings that share a parent
    const sibs = [...el.parentElement.children].filter((c) => els.has(c));
    const i = sibs.indexOf(el);
    el.style.setProperty("--d", `${Math.min(i, 5) * 0.06}s`);
    el.classList.add("is-pending");
    io.observe(el);
  });
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
