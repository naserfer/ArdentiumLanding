/**
 * LIGHTBOX — click a MotelApp capture to see it full size.
 * Built on <dialog>: focus is trapped and Esc closes it natively.
 */
export function initLightbox() {
  const dlg = document.getElementById("lightbox");
  if (!dlg || typeof dlg.showModal !== "function") return;
  const img = document.getElementById("lightboxImg");
  const cap = document.getElementById("lightboxCap");
  const html = document.documentElement;
  let opener = null;

  const close = () => { if (dlg.open) dlg.close(); };
  dlg.addEventListener("close", () => {
    html.classList.remove("lb-open");
    if (opener) opener.focus({ preventScroll: true });
  });
  // a click on the backdrop (the dialog box itself, outside the figure) closes it
  dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); });
  document.getElementById("lightboxClose").addEventListener("click", close);

  document.querySelectorAll("[data-zoom]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const src = btn.querySelector("img");
      const tag = btn.closest("figure")?.querySelector("figcaption");
      opener = btn;
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      cap.textContent = `MotelApp · ${tag ? tag.textContent : ""}`;
      html.classList.add("lb-open");
      dlg.showModal();
    });
  });
}
