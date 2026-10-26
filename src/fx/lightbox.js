/**
 * LIGHTBOX — click a case capture (MotelApp, Sabor del Chipá) to see it full size.
 * Built on <dialog>: focus is trapped and Esc closes it natively.
 * Each case is a small gallery: arrows, ← → keys or a horizontal swipe step through its captures,
 * so the ones at the back of the stack do not depend on the sliver of them that shows.
 */
export function initLightbox() {
  const dlg = document.getElementById("lightbox");
  if (!dlg || typeof dlg.showModal !== "function") return;
  const img = document.getElementById("lightboxImg");
  const cap = document.getElementById("lightboxCap");
  const count = document.getElementById("lightboxCount");
  const nav = document.getElementById("lightboxNav");
  const html = document.documentElement;
  let opener = null, set = [], at = 0;

  const show = (i) => {
    at = (i + set.length) % set.length;
    const btn = set[at];
    const src = btn.querySelector("img");
    const tag = btn.closest("figure")?.querySelector("figcaption");
    // the full-size original, not the srcset candidate sized for the stack
    img.src = src.src;
    img.alt = src.alt;
    const name = btn.closest(".case")?.querySelector(".case__name")?.textContent.trim() || "";
    cap.textContent = [name, tag ? tag.textContent : ""].filter(Boolean).join(" · ");
    if (count) count.textContent = `${at + 1} / ${set.length}`;
  };

  const close = () => { if (dlg.open) dlg.close(); };
  dlg.addEventListener("close", () => {
    html.classList.remove("lb-open");
    if (opener) opener.focus({ preventScroll: true });
  });
  // a click on the backdrop (the dialog box itself, outside the figure) closes it
  dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); });
  document.getElementById("lightboxClose").addEventListener("click", close);
  nav?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-step]");
    if (b) show(at + Number(b.dataset.step));
  });
  dlg.addEventListener("keydown", (e) => {
    if (set.length < 2) return;
    if (e.key === "ArrowRight") { e.preventDefault(); show(at + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); show(at - 1); }
  });
  let sx = null;
  dlg.addEventListener("touchstart", (e) => { sx = e.touches.length === 1 ? [e.touches[0].clientX, e.touches[0].clientY] : null; }, { passive: true });
  dlg.addEventListener("touchend", (e) => {
    if (!sx || set.length < 2) return;
    const t = e.changedTouches[0], dx = t.clientX - sx[0], dy = t.clientY - sx[1];
    sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(at + (dx < 0 ? 1 : -1));
  }, { passive: true });

  document.querySelectorAll("[data-zoom]").forEach((btn) => {
    btn.addEventListener("click", () => {
      // front capture first, as the stack shows them
      set = [...(btn.closest(".screens")?.querySelectorAll("[data-zoom]") || [btn])].reverse();
      opener = btn;
      if (nav) nav.hidden = set.length < 2;
      show(set.indexOf(btn));
      html.classList.add("lb-open");
      dlg.showModal();
    });
  });
}
