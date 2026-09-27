/**
 * Scroll‑driven choreography, all computed inside the shared ticker:
 * nav behaviour, the heat gauge (scroll = temperature), the velocity marquee, the manifesto
 * that heats word by word, the two case stages, and the molten process rail.
 */
import { state, clamp, easeInOut, watchVisible } from "./ticker.js";

const MELT = 1538; // °C — melting point of iron; the page "melts" at the bottom

export function initScrollFx() {
  const updaters = [];
  const $ = (s) => document.querySelector(s);

  /* ---------- nav: solid after the fold, hides on the way down ---------- */
  const nav = $("#nav");
  if (nav) {
    let hidden = false;
    updaters.push((s) => {
      nav.classList.toggle("is-scrolled", s.scrollY > 40);
      const hide = s.scrollY > 500 && s.scrollDir > 0 && Math.abs(s.scrollVel) > 1;
      const show = s.scrollDir < 0 && Math.abs(s.scrollVel) > 1;
      if (hide && !hidden) { hidden = true; nav.classList.add("is-hidden"); }
      else if ((show || s.scrollY < 500) && hidden) { hidden = false; nav.classList.remove("is-hidden"); }
    });
  }

  /* ---------- heat gauge ---------- */
  const gFill = $("#gaugeFill"), gTemp = $("#gaugeTemp"), gauge = $(".gauge"), navBar = $("#navProgress");
  if (gFill) {
    updaters.push((s) => {
      gauge.classList.toggle("is-on", s.scrollY > s.vh * 0.6 && !document.documentElement.classList.contains("is-loading"));
      const max = document.documentElement.scrollHeight - s.vh;
      const p = clamp(s.scrollY / Math.max(1, max));
      gFill.style.transform = `scaleY(${p})`;
      if (navBar) navBar.style.transform = `scaleX(${p})`;
      gTemp.textContent = Math.round(20 + p * (MELT - 20));
    });
  }

  /* ---------- hero readout flickers like a real pyrometer ---------- */
  const heroTemp = $("#heroTemp");
  if (heroTemp && !state.reduced) {
    let acc = 0, v = MELT;
    updaters.push((s) => {
      acc += s.dt;
      if (acc < 0.28) return;
      acc = 0;
      v = clamp(v + (Math.random() - 0.5) * 6, MELT - 9, MELT + 9);
      heroTemp.textContent = Math.round(v);
    });
  }

  /* ---------- marquee rows: base drift + scroll velocity, skew with speed, opposite directions ---------- */
  if (!state.reduced) {
    [["#marquee", 1, 60], ["#marquee2", -1, 38]].forEach(([sel, dir, base]) => {
      const track = $(sel);
      if (!track) return;
      // clone content until it is well over twice the viewport for a seamless loop
      const original = [...track.children];
      let copies = 1;
      do { original.forEach((n) => track.appendChild(n.cloneNode(true))); copies++; }
      while (track.scrollWidth < innerWidth * 2.4 && copies < 14);
      // one loop period = distance between the first item of copy 1 and copy 2
      const period = () => track.children[original.length].offsetLeft - track.children[0].offsetLeft || 1;
      let x = dir > 0 ? 0 : -period(), w = period();
      addEventListener("resize", () => { w = period(); }, { passive: true });
      if (document.fonts) document.fonts.ready.then(() => { w = period(); });
      let vis = true;
      watchVisible(track, (v) => { vis = v; }, "100px");
      updaters.push((s) => {
        if (!vis) return;
        const speed = base + Math.min(Math.abs(s.scrollVel) * 26, 1300);
        x -= speed * s.dt * (s.scrollDir >= 0 ? 1 : -1) * dir;
        if (x <= -w) x += w;
        if (x > 0) x -= w;
        const skew = clamp(s.scrollVel * -0.35 * dir, -10, 10);
        track.style.transform = `translate3d(${x}px,0,0) skewX(${skew}deg)`;
      });
    });
  }

  /* ---------- manifesto heats word by word ---------- */
  const man = $("#manifesto");
  if (man && !state.reduced) {
    const words = man.textContent.trim().split(/\s+/);
    man.innerHTML = words.map((w) => `<span class="w">${w}</span> `).join("");
    const spans = [...man.querySelectorAll(".w")];
    const N = spans.length, band = 7;
    updaters.push((s) => {
      const r = man.getBoundingClientRect();
      if (r.bottom < -50 || r.top > s.vh + 50) return;
      const p = clamp((s.vh * 0.88 - r.top) / (r.height + s.vh * 0.42));
      const front = p * (N + band);
      for (let i = 0; i < N; i++) {
        const h = clamp((front - i) / band);
        const el = spans[i];
        if (el._h === h) continue;
        el._h = h;
        el.style.setProperty("--heat", h.toFixed(3));
        el.style.setProperty("--glow", (1 - Math.abs(h * 2 - 1)).toFixed(3));
      }
    });
  }

  /* ---------- case progress helper (sticky stage on desktop, in‑flow on mobile) ---------- */
  const caseProgress = (caseEl, stage, s) => {
    const r = caseEl.getBoundingClientRect();
    if (r.height > s.vh * 1.5) return clamp(-r.top / (r.height - s.vh) / 0.72);
    const q = stage.getBoundingClientRect();
    return clamp((s.vh * 0.95 - q.top) / (q.height * 0.8 + s.vh * 0.3));
  };

  /* ---------- KarúBox: order → print → dashboard ---------- */
  const karuCase = $("#karubox"), karu = $("#karuStage");
  if (karu && !state.reduced) {
    const stepsK = [...karu.querySelectorAll(".karu__steps li")];
    const sales = $("#karuSales");
    const fmt = (n) => "Gs. " + Math.round(n / 1000).toLocaleString("es-PY").replace(/,/g, ".") + ".000";
    let lastSales = "";
    updaters.push((s) => {
      const r = karuCase.getBoundingClientRect();
      if (r.bottom < 0 || r.top > s.vh) return;
      const p = caseProgress(karuCase, karu, s);
      const p2 = clamp((p - 0.28) / 0.18);
      karu.style.setProperty("--p1", clamp(p / 0.3).toFixed(3));
      karu.style.setProperty("--p2", p2.toFixed(3));
      karu.style.setProperty("--p2g", (1 - Math.abs(p2 * 2 - 1)).toFixed(3));
      karu.style.setProperty("--p3", easeInOut(clamp((p - 0.42) / 0.3)).toFixed(3));
      const p3 = clamp((p - 0.42) / 0.3), p4 = easeInOut(clamp((p - 0.62) / 0.36));
      karu.style.setProperty("--p4", p4.toFixed(3));
      karu.classList.toggle("is-printing", p3 > 0.02 && p3 < 0.98);
      stepsK[0].classList.toggle("is-on", p > 0.04);
      stepsK[1].classList.toggle("is-on", p3 > 0.02);
      stepsK[2].classList.toggle("is-on", p4 > 0.02);
      const txt = fmt(3314000 + 98000 * p4);
      if (sales && txt !== lastSales) { sales.textContent = txt; lastSales = txt; }
    });
  }

  /* ---------- MotelApp: screens rise from a tilted stack and fan out ---------- */
  const motelCase = $("#motelapp"), motel = $("#motelStage");
  if (motel && !state.reduced) {
    const front = motel.querySelector(".screen--1");
    const setScan = () => motel.style.setProperty("--scan-h", `${front.offsetHeight}px`);
    new ResizeObserver(setScan).observe(front);
    updaters.push((s) => {
      const r = motelCase.getBoundingClientRect();
      if (r.bottom < 0 || r.top > s.vh) return;
      const p = easeInOut(caseProgress(motelCase, motel, s));
      motel.style.setProperty("--p", p.toFixed(4));
    });
  }

  /* ---------- process rail fills, steps light as it passes ---------- */
  const steps = $("#steps");
  if (steps && !state.reduced) {
    const items = [...steps.querySelectorAll(".step")];
    updaters.push((s) => {
      const r = steps.getBoundingClientRect();
      if (r.bottom < -100 || r.top > s.vh + 100) return;
      const p = clamp((s.vh * 0.62 - r.top) / r.height);
      steps.style.setProperty("--p", p.toFixed(4));
      const y = p * r.height;
      items.forEach((it) => it.classList.toggle("is-lit", it.offsetTop + 30 < y));
    });
  }

  /* ---------- active nav link ---------- */
  const links = [...document.querySelectorAll(".nav__links a")];
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${e.target.id}`));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["servicios", "trabajos", "proceso", "contacto"].forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* ---------- floating WhatsApp steps aside while a big CTA is on screen ---------- */
  const fab = $(".wa-float");
  if (fab) {
    let heroVis = true, ctaVis = false;
    const upd = () => fab.classList.toggle("is-away", heroVis || ctaVis);
    watchVisible($("#top"), (v) => { heroVis = v; upd(); }, "-35% 0px 0px 0px");
    watchVisible($("#contacto"), (v) => { ctaVis = v; upd(); }, "0px 0px -30% 0px");
  }

  return (s) => { for (const u of updaters) u(s); };
}
