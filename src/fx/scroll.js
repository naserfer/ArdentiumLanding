/**
 * Scroll‑driven choreography, all computed inside the shared ticker:
 * nav behaviour, the heat gauge (scroll = temperature), the velocity marquee, the two case
 * stages, and the molten process rail. (The manifesto's word heat lives in story.js.)
 * Layout is only read in the ticker's read phase, and only for blocks that are on screen.
 */
import { state, clamp, easeInOut, watchVisible, onRead, trackRect } from "./ticker.js";

const MELT = 1538; // °C — melting point of iron; the page "melts" at the bottom

export function initScrollFx() {
  const updaters = [];
  const readers = [];
  const $ = (s) => document.querySelector(s);
  onRead((s) => { for (const r of readers) r(s); });

  /** box.r = el's live viewport rect while el is near the screen (null otherwise); box.q = a second one. */
  const rectWhileVisible = (el, margin = "120px", second) => {
    const box = { r: null, q: null, v: false };
    const t = trackRect(el), t2 = second && trackRect(second);
    watchVisible(el, (v) => { box.v = v; }, margin);
    readers.push(() => { box.r = box.v ? t : null; box.q = box.v ? t2 : null; });
    return box;
  };

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
    let docH = document.documentElement.scrollHeight;
    if ("ResizeObserver" in window) new ResizeObserver(() => { docH = document.documentElement.scrollHeight; }).observe(document.body);
    let lastT = "", lastP = -1;
    updaters.push((s) => {
      gauge.classList.toggle("is-on", s.scrollY > s.vh * 0.6 && !document.documentElement.classList.contains("is-loading"));
      const p = clamp(s.scrollY / Math.max(1, docH - s.vh));
      if (p === lastP) return;
      lastP = p;
      gFill.style.transform = `scaleY(${p})`;
      if (navBar) navBar.style.transform = `scaleX(${p})`;
      const t = String(Math.round(20 + p * (MELT - 20)));
      if (t !== lastT) { gTemp.textContent = t; lastT = t; }
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
      // not rendered (the depth journey hides the band): its width is 0 and cloning would never stop short
      if (!track || !track.offsetParent) return;
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
        // touch: steady drift, no speed boost or skew (they read as the screen shaking under the finger)
        const vel = state.pointerFine ? s.scrollVel : 0;
        const speed = base + Math.min(Math.abs(vel) * 26, 1300);
        x -= speed * s.dt * (s.scrollDir >= 0 || !state.pointerFine ? 1 : -1) * dir;
        if (x <= -w) x += w;
        if (x > 0) x -= w;
        const skew = clamp(vel * -0.35 * dir, -10, 10);
        track.style.transform = `translate3d(${x}px,0,0) skewX(${skew}deg)`;
      });
    });
  }

  /* ---------- case progress helper (sticky stage on desktop, in‑flow on mobile) ---------- */
  const caseProgress = (r, q, s) => {
    if (r.height > s.vh * 1.5) return clamp(-r.top / (r.height - s.vh) / 0.72);
    return clamp((s.vh * 0.95 - q.top) / (q.height * 0.8 + s.vh * 0.3));
  };
  // the stage is only measured on the in‑flow (mobile) layout, where it is not sticky
  const watchCase = (caseEl, stage) => rectWhileVisible(caseEl, "60px", stage);

  /* ---------- KarúBox: order → print → dashboard ---------- */
  const karuCase = $("#karubox"), karu = $("#karuStage");
  if (karu && !state.reduced) {
    const stepsK = [...karu.querySelectorAll(".karu__steps li")];
    const sales = $("#karuSales");
    const fmt = (n) => "Gs. " + Math.round(n / 1000).toLocaleString("es-PY").replace(/,/g, ".") + ".000";
    let lastSales = "";
    const kb = watchCase(karuCase, karu);
    updaters.push((s) => {
      const r = kb.r;
      if (!r || r.bottom < 0 || r.top > s.vh) return;
      const p = caseProgress(r, kb.q, s);
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

  /* ---------- screen cases (MotelApp, Sabor del Chipá): captures rise from a tilted stack and fan out ---------- */
  if (!state.reduced) {
    document.querySelectorAll(".case .screens").forEach((stage) => {
      const caseEl = stage.closest(".case");
      const front = stage.querySelector(".screen--1");
      if (!caseEl || !front) return;
      const setScan = () => stage.style.setProperty("--scan-h", `${front.offsetHeight}px`);
      new ResizeObserver(setScan).observe(front);
      const cb = watchCase(caseEl, stage);
      let lastP = "";
      updaters.push((s) => {
        const r = cb.r;
        if (!r || r.bottom < 0 || r.top > s.vh) return;
        const p = easeInOut(caseProgress(r, cb.q, s)).toFixed(4);
        if (p !== lastP) { stage.style.setProperty("--p", p); lastP = p; }
      });
    });
  }

  /* ---------- process rail: the metal changes state at every stage ----------
     Fundir (liquid, white‑hot) → Moldear (orange) → Forjar (cherry red) → Templar (temper colours)
     → Entregar (finished steel). A bead of material rides the front of the rail and takes on the
     state of the stage it is crossing; every lit stage keeps its own state. */
  const steps = $("#steps");
  if (steps && !state.reduced) {
    const items = [...steps.querySelectorAll(".step")];
    const head = document.createElement("i");
    head.className = "steps__head";
    head.setAttribute("aria-hidden", "true");
    steps.appendChild(head);
    // offsets only change with layout, not with scroll
    let tops = [], H = 1;
    const measure = () => {
      H = steps.offsetHeight || 1;
      tops = items.map((it) => it.offsetTop + 30);
      steps.style.setProperty("--h", `${H}px`);
    };
    measure();
    new ResizeObserver(measure).observe(steps);
    const sb = rectWhileVisible(steps, "100px", $("#proceso"));
    const html = document.documentElement;
    let lastP = "", lastStage = -1;
    updaters.push((s) => {
      const r = sb.r;
      if (!r) return;
      // chamber (html.ch-on): the rail fills while the chamber holds still, full a bit before it leaves
      const q = sb.q;
      const p = html.classList.contains("ch-on")
        ? clamp(-q.top / ((q.height - s.vh) * 0.85))
        : clamp((s.vh * 0.62 - r.top) / r.height);
      const ps = p.toFixed(4);
      if (ps === lastP) return;
      lastP = ps;
      steps.style.setProperty("--p", ps);
      const y = p * H;
      let stage = -1;
      items.forEach((it, i) => { const lit = tops[i] < y; it.classList.toggle("is-lit", lit); if (lit) stage = i; });
      if (stage !== lastStage) { steps.dataset.stage = String(stage + 1); lastStage = stage; }
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
    // top and nombre have no link: crossing them clears the active one
    ["top", "nombre", "servicios", "trabajos", "proceso", "equipo", "contacto"].forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
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
