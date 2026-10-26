/**
 * Mobile menu (≤820 px, where the nav links do not fit). Every stop of the journey shows the
 * temperature the gauge reads when you get there: the menu is a map of the forge.
 * While it is open the page behind is inert and does not scroll; Escape or a link closes it.
 */
const MELT = 1538;

export function initMenu() {
  const btn = document.getElementById("menuBtn"), menu = document.getElementById("menu");
  if (!btn || !menu) return;
  const html = document.documentElement;
  const behind = [document.getElementById("contenido"), document.getElementById("pie"), document.querySelector(".wa-float")].filter(Boolean);
  const links = [...menu.querySelectorAll(".menu__list a")];
  let open = false, timer = 0;

  const temps = () => {
    const max = Math.max(1, html.scrollHeight - innerHeight);
    for (const a of links) {
      const el = document.querySelector(a.getAttribute("href"));
      const t = a.querySelector("[data-menu-t]");
      if (!el || !t) continue;
      const y = Math.min(max, el.getBoundingClientRect().top + scrollY);
      t.textContent = `${Math.round(20 + (y / max) * (MELT - 20))} °C`;
    }
  };

  const set = (v, { focus = true } = {}) => {
    if (v === open) return;
    open = v;
    clearTimeout(timer);
    btn.setAttribute("aria-expanded", String(v));
    btn.setAttribute("aria-label", v ? "Cerrar menú" : "Abrir menú");
    for (const el of behind) el.inert = v;
    if (v) {
      temps();
      menu.hidden = false;
      void menu.offsetWidth;
      html.classList.add("menu-open");
      if (focus) links[0]?.focus({ preventScroll: true });
    } else {
      html.classList.remove("menu-open");
      timer = setTimeout(() => { menu.hidden = true; }, 420);
      if (focus) btn.focus({ preventScroll: true });
    }
  };

  btn.addEventListener("click", () => set(!open));
  // the link's own navigation runs after this handler, once the page can scroll again
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) set(false, { focus: false }); });
  addEventListener("keydown", (e) => { if (open && e.key === "Escape") set(false); });
  matchMedia("(min-width: 821px)").addEventListener("change", (m) => { if (m.matches) set(false, { focus: false }); });
}
