/**
 * Ardentium · configuración editable
 * ----------------------------------
 * Cambiá acá el número de WhatsApp: solo dígitos, con código de país
 * (Paraguay = 595) y sin el 0 inicial del celular.
 * Ejemplo: 0981 123 456  →  "595981123456"
 */
export const CONFIG = {
  // Dirección pública del sitio, sin barra final. Se usa para SEO: URL canónica, imagen al
  // compartir en redes, sitemap.xml y datos estructurados. Ej.: "https://ardentium.com.py"
  // (también se puede definir con la variable de entorno SITE_URL al hacer el build).
  siteUrl: "",
  whatsapp: "595982906021",
  whatsappMessage: "Hola Ardentium, quiero contarles sobre un proyecto.",
};

export function waLink() {
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(CONFIG.whatsappMessage)}`;
}

/** "595981123456" → "+595 981 123 456" */
export function waPretty() {
  const d = CONFIG.whatsapp.replace(/\D/g, "");
  const cc = d.slice(0, 3);
  const rest = d.slice(3).replace(/(\d{3})(?=\d)/g, "$1 ");
  return `+${cc} ${rest}`.trim();
}
