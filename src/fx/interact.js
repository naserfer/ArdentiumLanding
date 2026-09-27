/**
 * Micro‑interactions: magnetic buttons, scrambled nav labels, 3D tilt, cursor heat‑spots
 * and count‑up numbers.
 */
import { state, easeOutExpo } from "./ticker.js";

/** Buttons lean toward the pointer, then snap back with an elastic ease. */
export function initMagnetic() {
  if (!state.pointerFine || state.reduced) return;
  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    const strength = el.classList.contains("btn--xl") ? 0.28 : 0.35;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transitionTimingFunction = "cubic-bezier(.16,1,.3,1)";
      el.style.transform = `translate(${x * strength}px, ${y * strength * 1.2}px)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transitionTimingFunction = "cubic-bezier(.2,1.7,.35,1)";
      el.style.transform = "";
    });
  });
}

/** Hovered labels decode through random glyphs before settling. */
export function initScramble() {
  if (state.reduced) return;
  const glyphs = "ARDENTIUM#%&*+=<>/0123456789";
  document.querySelectorAll("[data-scramble]").forEach((el) => {
    const final = el.textContent;
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      const start = performance.now();
      const dur = 420;
      const step = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const fixed = Math.floor(p * final.length);
        let out = final.slice(0, fixed);
        for (let i = fixed; i < final.length; i++) out += final[i] === " " ? " " : glyphs[(Math.random() * glyphs.length) | 0];
        el.textContent = out;
        if (p < 1) raf = requestAnimationFrame(step);
        else el.textContent = final;
      };
      raf = requestAnimationFrame(step);
    };
    el.addEventListener("pointerenter", run);
    el.addEventListener("focus", run);
  });
}

/** 3D tilt + moving glare on the element tile. */
export function initTilt() {
  if (!state.pointerFine || state.reduced) return;
  document.querySelectorAll("[data-tilt]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty("--ry", `${(px - 0.5) * 22}deg`);
      el.style.setProperty("--rx", `${(0.5 - py) * 18}deg`);
      el.style.setProperty("--gx", `${px * 100}%`);
      el.style.setProperty("--gy", `${py * 100}%`);
    });
    el.addEventListener("pointerleave", () => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    });
  });
}

/** Cards track the cursor with a radial heat spot and a glowing rim. */
export function initSpot() {
  document.querySelectorAll("[data-spot]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
}

/** Numbers count up the first time they scroll into view (only if they start off‑screen). */
export function initCounters() {
  if (state.reduced || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target;
      const to = +el.dataset.count;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / 1400);
        el.textContent = Math.round(to * easeOutExpo(p));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll("[data-count]").forEach((el) => {
    if (el.getBoundingClientRect().top > innerHeight) { el.textContent = "0"; io.observe(el); }
  });
}

/** Touch screens have no hover: a card "heats up" while it crosses the middle of the screen. */
export function initTouchHeat() {
  if (state.pointerFine || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle("is-hot", e.isIntersecting));
  }, { rootMargin: "-38% 0px -38% 0px" });
  document.querySelectorAll("[data-spot]").forEach((el) => io.observe(el));
}
