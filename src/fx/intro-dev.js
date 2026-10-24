/**
 * DEV ONLY — frame‑by‑frame control of the intro. Never part of the production build
 * (preloader.js imports it behind import.meta.env.DEV).
 *
 *   ?intro        force the full intro      ?intro&hold   keep the last frame, no clean‑up
 *   window.__intro.seek(2.4) / .pause() / .play() / .rate(0.25)
 *   HUD: slider to scrub, ␣ play/pause (only in hold mode), ← → step one frame
 */
export function attach(ctl) {
  window.__intro = ctl;
  if (!ctl.hold) return;
  const hud = document.createElement("div");
  hud.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:400;display:flex;gap:10px;align-items:center;padding:8px 12px;border-radius:8px;background:rgb(0 0 0 / .78);color:#ffc36b;font:12px/1 'JetBrains Mono',monospace;";
  hud.innerHTML = `<button type="button" style="all:unset;cursor:pointer;color:#fff5e0">❚❚</button><input type="range" min="0" max="5.5" step="0.01" value="0" style="width:280px"><span>0.00 s</span>`;
  document.body.appendChild(hud);
  const [btn, range, label] = hud.children;
  let paused = false;
  const set = (p) => { paused = p; btn.textContent = p ? "▶" : "❚❚"; p ? ctl.pause() : ctl.play(); };
  btn.addEventListener("click", () => set(!paused));
  range.addEventListener("input", () => { set(true); ctl.seek(+range.value); });
  addEventListener("keydown", (e) => {
    if (e.key === " ") { e.preventDefault(); set(!paused); }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { set(true); ctl.seek(ctl.t + (e.key === "ArrowRight" ? 1 : -1) / 60); }
  });
  const loop = () => { label.textContent = `${ctl.t.toFixed(2)} s`; if (!paused) range.value = ctl.t; requestAnimationFrame(loop); };
  loop();
}
