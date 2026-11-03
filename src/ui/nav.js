/**
 * Navigation: solid bar after the fold, a thin molten progress line (scroll = temperature),
 * the active section link, the floating WhatsApp button and the mobile menu.
 */
import { watchVisible } from "../fx/loop.js";

export function initNav() {
  const nav = document.getElementById("nav");
  const bar = document.getElementById("navProgress");
  if (!nav) return;

  let queued = false;
  const update = () => {
    queued = false;
    const y = scrollY;
    nav.classList.toggle("is-scrolled", y > 40);
    if (bar) {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    }
  };
  addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  update();

  // active link: the section crossing the middle of the screen
  const links = [...nav.querySelectorAll(".nav__links a")];
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        for (const a of links) a.classList.toggle("is-active", a.getAttribute("href") === `#${e.target.id}`);
      }
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main > section[id]").forEach((el) => io.observe(el));
  }

  // the floating WhatsApp button steps aside while a big call to action is already on screen
  const fab = document.querySelector(".wa-float");
  if (fab) {
    let heroVis = true, ctaVis = false;
    const upd = () => fab.classList.toggle("is-away", heroVis || ctaVis);
    watchVisible(document.getElementById("top"), (v) => { heroVis = v; upd(); }, "-35% 0px 0px 0px");
    watchVisible(document.getElementById("contacto"), (v) => { ctaVis = v; upd(); }, "0px 0px -30% 0px");
  }

  initMenu();
}

/** Mobile menu (≤820 px). While open, the page behind is inert and does not scroll. */
function initMenu() {
  const btn = document.getElementById("menuBtn"), menu = document.getElementById("menu");
  if (!btn || !menu) return;
  const html = document.documentElement;
  const behind = [document.getElementById("contenido"), document.getElementById("pie"), document.querySelector(".wa-float")].filter(Boolean);
  const first = menu.querySelector("a");
  let open = false, timer = 0;

  const set = (v, { focus = true } = {}) => {
    if (v === open) return;
    open = v;
    clearTimeout(timer);
    btn.setAttribute("aria-expanded", String(v));
    btn.setAttribute("aria-label", v ? "Cerrar menú" : "Abrir menú");
    for (const el of behind) el.inert = v;
    if (v) {
      menu.hidden = false;
      void menu.offsetWidth;   // start the fade from the hidden state
      html.classList.add("menu-open");
      if (focus) first?.focus({ preventScroll: true });
    } else {
      html.classList.remove("menu-open");
      timer = setTimeout(() => { menu.hidden = true; }, 400);
      if (focus) btn.focus({ preventScroll: true });
    }
  };

  btn.addEventListener("click", () => set(!open));
  // the link's own navigation runs after this handler, once the page can scroll again
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) set(false, { focus: false }); });
  addEventListener("keydown", (e) => { if (open && e.key === "Escape") set(false); });
  matchMedia("(min-width: 821px)").addEventListener("change", (m) => { if (m.matches) set(false, { focus: false }); });
}
