/**
 * The ember tunnel (html.ch-on only): sparks streaming past the camera as you go deeper.
 * Each spark's depth is a function of the scroll position, never of its velocity, so on touch
 * nothing moves unless the page does. It burns brighter while passing from one chamber to the
 * next, with an incandescent rim like the mouth of a furnace. Colour follows the temperature.
 *
 * Also: typing 1538 (the melting point of iron, the bottom of the gauge) melts the page.
 */
import { state, onTick, onRead, trackRect, clamp, lerp } from "./ticker.js";

const html = document.documentElement;
const MELT_S = 2.8;

export function initTunnel(canvas) {
  if (!canvas) return;
  if (state.reduced || !html.classList.contains("ch-on")) { canvas.remove(); return; }
  const ctx = canvas.getContext("2d");
  const N = state.mobile ? 150 : 280;
  const P = Array.from({ length: N }, () => {
    const a = Math.random() * Math.PI * 2, r = 0.18 + Math.pow(Math.random(), 0.7) * 1.25;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.85, z: Math.random(), s: 0.5 + Math.random() * 1.5 };
  });
  const rooms = [trackRect(document.getElementById("top")), ...[...document.querySelectorAll(".ch")].filter((c) => c.offsetParent).map(trackRect)];

  let W = 0, H = 0, dpr = 1, docH = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    docH = Math.max(1, html.scrollHeight - innerHeight);
    drawnY = NaN;
  };
  new ResizeObserver(resize).observe(document.body);
  addEventListener("resize", resize, { passive: true });

  let pass = 0, drawnY = NaN, melt = 0, drift = 0;
  onRead((s) => {
    // the hero's exit and every chamber's entry are passages: a bell over each. A chamber's
    // content is readable from about half its entry on, so its bell is over by then: the
    // sparks fly past while it arrives, never across what you are reading
    let p = Math.sin(Math.PI * clamp(s.scrollY / s.vh)) * 0.9;
    for (let i = 1; i < rooms.length; i++) {
      const e = (1 - rooms[i].top / s.vh) / 0.5;
      if (e > 0 && e < 1) p = Math.max(p, Math.sin(Math.PI * e));
    }
    pass = p;
  });

  onTick((s) => {
    if (melt > 0) melt = Math.max(0, melt - s.dt);
    if (state.pointerFine || melt > 0) drift += s.dt * (0.035 + melt * 0.5);
    const idle = !state.pointerFine && melt <= 0 && s.scrollY === drawnY;
    if (idle || !W) return;
    drawnY = s.scrollY;

    const m = melt / MELT_S;
    const I = Math.min(1, 0.03 + pass * 0.97 + m);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (I < 0.02) return;

    const T = clamp(s.scrollY / docH);
    const g = Math.round(lerp(70, 236, Math.max(T, m))), b = Math.round(lerp(18, 196, Math.max(T * T, m)));
    const cx = W / 2, cy = H / 2, R = Math.max(cx, cy);
    const travel = s.scrollY / (s.vh * 1.15) + drift;
    const tail = 0.025 + pass * 0.07 + m * 0.12;

    ctx.lineCap = "round";
    for (const q of P) {
      const z = (((q.z - travel) % 1) + 1) % 1;
      const z1 = 0.035 + z * 1.6, z2 = 0.035 + Math.min(1, z + tail) * 1.6;
      const x1 = cx + (q.x * R) / z1, y1 = cy + (q.y * R) / z1;
      if (x1 < -40 || x1 > W + 40 || y1 < -40 || y1 > H + 40) continue;
      const x2 = cx + (q.x * R) / z2, y2 = cy + (q.y * R) / z2;
      const a = I * Math.pow(1 - z, 1.6) * Math.min(1, z * 12);
      ctx.strokeStyle = `rgba(255,${g},${b},${a.toFixed(3)})`;
      ctx.lineWidth = Math.min(7, (q.s * 0.9) / z1);
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x1, y1); ctx.stroke();
    }

    // the furnace mouth: an incandescent rim while passing through
    const rim = pass * 0.42 + m * 0.6;
    if (rim > 0.01) {
      const grad = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R * 1.25);
      grad.addColorStop(0, "rgba(255,90,20,0)");
      grad.addColorStop(0.7, `rgba(255,${Math.round(lerp(80, 180, Math.max(T, m)))},30,${(rim * 0.5).toFixed(3)})`);
      grad.addColorStop(1, `rgba(255,${g},${b},${rim.toFixed(3)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
  });

  /* ---------- 1538 ---------- */
  const note = document.getElementById("meltNote");
  let typed = "", timer = 0;
  addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.("input, textarea, select, [contenteditable]")) return;
    typed = (typed + e.key).slice(-4);
    if (typed !== "1538") return;
    typed = "";
    melt = MELT_S;
    html.classList.remove("is-melt"); void html.offsetWidth; html.classList.add("is-melt");
    if (note) { note.textContent = "1538 °C · punto de fusión del hierro · lo encontraste"; note.classList.add("is-on"); }
    clearTimeout(timer);
    timer = setTimeout(() => { html.classList.remove("is-melt"); note?.classList.remove("is-on"); }, MELT_S * 1000 + 600);
  });
}
