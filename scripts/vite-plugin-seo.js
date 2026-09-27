/**
 * Plugin de Vite para SEO.
 * - Reemplaza %SITE_URL% en index.html (canónica, Open Graph, datos estructurados).
 * - Si el número de WhatsApp está configurado, lo escribe en los enlaces del HTML y en los
 *   datos estructurados (así funcionan también sin JavaScript y para los buscadores).
 * - En el build genera robots.txt, sitemap.xml y llms.txt.
 */
import { CONFIG } from "../src/config.js";

const PLACEHOLDER_WA = "https://wa.me/595000000000";
const PLACEHOLDER_NUM = "+595 000 000 000";

export function seoContext(siteUrl = "") {
  const site = String(siteUrl || "").trim().replace(/\/+$/, "");
  const phone = String(CONFIG.whatsapp || "").replace(/\D/g, "");
  const hasPhone = phone.length >= 10 && !/^5950+$/.test(phone);
  const link = `https://wa.me/${phone}?text=${encodeURIComponent(CONFIG.whatsappMessage)}`;
  const pretty = `+${phone.slice(0, 3)} ${phone.slice(3).replace(/(\d{3})(?=\d)/g, "$1 ")}`;
  return { site, phone, hasPhone, link, pretty };
}

export function transformHtml(html, ctx) {
  let out = html.split("%SITE_URL%").join(ctx.site);
  if (ctx.hasPhone) {
    out = out.split(PLACEHOLDER_WA).join(ctx.link);
    out = out.split(PLACEHOLDER_NUM).join(ctx.pretty);
    out = out.replace(
      '"contactPoint": []',
      `"contactPoint": [{ "@type": "ContactPoint", "contactType": "sales", "telephone": "+${ctx.phone}", "url": "${ctx.link}", "availableLanguage": ["es"] }]`,
    );
  }
  return out;
}

export function extraFiles(ctx, date = new Date()) {
  const files = [];
  const robots = ["User-agent: *", "Allow: /"];
  if (ctx.site) robots.push("", `Sitemap: ${ctx.site}/sitemap.xml`);
  files.push({ fileName: "robots.txt", source: robots.join("\n") + "\n" });

  if (ctx.site) {
    const day = date.toISOString().slice(0, 10);
    files.push({
      fileName: "sitemap.xml",
      source:
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
        `  <url>\n    <loc>${ctx.site}/</loc>\n    <lastmod>${day}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n` +
        `    <image:image><image:loc>${ctx.site}/og.jpg</image:loc></image:image>\n  </url>\n</urlset>\n`,
    });
  }

  const base = ctx.site || "";
  files.push({
    fileName: "llms.txt",
    source: `# Ardentium

> Fábrica de desarrollo de software en Asunción, Paraguay, fundada en 2026 por Naser Fernández e Iván Ortiz, que entre los dos suman más de 10 años en el mundo del software. Lema: Vanguardia.

## Servicios
- Software a medida y SaaS: plataformas web y sistemas en la nube.
- Apps de escritorio y offline: sistemas que funcionan sin internet, imprimen, sincronizan y se respaldan solos.
- Apps móviles para iOS y Android.
- IA y automatización: asistentes, bots e integraciones.

## Trabajos
- KarúBox (producto propio): POS en la nube para lomiterías y restaurantes, con inventario automático, puntos de fidelidad, impresión remota y reportes en tiempo real. https://www.karubox.com.py/
- MotelApp: sistema de escritorio para recepción y administración de moteles, con tablero de habitaciones en vivo, cobro, tickets térmicos y analítica; opera sin internet y sincroniza con la nube.

## Contacto
- Sitio: ${base || "(sin dominio configurado)"}/
${ctx.hasPhone ? `- WhatsApp: ${ctx.pretty} (${ctx.link})\n` : ""}`,
  });
  return files;
}

export default function seo({ siteUrl = "" } = {}) {
  const ctx = seoContext(siteUrl);
  return {
    name: "ardentium-seo",
    transformIndexHtml(html) {
      return transformHtml(html, ctx);
    },
    generateBundle() {
      for (const f of extraFiles(ctx)) this.emitFile({ type: "asset", fileName: f.fileName, source: f.source });
    },
  };
}
