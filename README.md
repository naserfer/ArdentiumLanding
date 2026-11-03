# Ardentium · Landing

Landing page de **Ardentium**, fábrica de desarrollo (Asunción, Paraguay). Lema: *Vanguardia*.

Hecha sin dependencias de runtime: el fondo de metal fundido es **WebGL puro** (shader propio),
las chispas son un sistema de partículas en Canvas 2D y todo corre en un único
`requestAnimationFrame` que se detiene cuando nada se mueve. Unos 18 KB de JavaScript.

## Cómo correrlo

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev       # servidor local con recarga en vivo
npm run build     # genera la carpeta dist/ lista para subir
npm run preview   # prueba el build localmente
```

La carpeta `dist/` se puede subir tal cual a Vercel, Netlify, Cloudflare o cualquier hosting
estático (las rutas son relativas, funciona también dentro de una subcarpeta).

## Publicar en Cloudflare (Workers)

El repo ya trae `wrangler.jsonc`, que le dice a Cloudflare que sirva la carpeta `dist/`.
En el panel de Cloudflare (Workers → importar repositorio de GitHub):

| Campo           | Valor                |
|-----------------|----------------------|
| Project name    | `ardentiumlanding` (igual al `name` de `wrangler.jsonc`) |
| Build command   | `npm run build`      |
| Deploy command  | `npx wrangler deploy` |

Cada `git push` a `main` vuelve a publicar el sitio. Si cambiás el nombre del proyecto en
Cloudflare, cambiá también `name` en `wrangler.jsonc`, o el build falla.
Desde tu PC también podés publicar con `npm run deploy` (pide iniciar sesión en Cloudflare).

## SEO

Ya viene configurado:

- `<title>` y descripción con las palabras clave del negocio, un solo `h1` visible y encabezados ordenados.
- Imagen para compartir en WhatsApp, Facebook, LinkedIn y X (`public/og.jpg`, 1200 × 630), con sus
  etiquetas Open Graph y Twitter.
- Datos estructurados (schema.org): organización, fundadores, servicios, KarúBox, MotelApp, Sabor del Chipá y las
  preguntas frecuentes.
- Sección de preguntas frecuentes con contenido que responde búsquedas reales.
- `robots.txt`, `sitemap.xml` y `llms.txt` (para buscadores con IA) que se generan en cada build.
- Íconos para iPhone y Android, `favicon.ico` y `site.webmanifest`.
- `public/_headers`: caché larga para los archivos del build y cabeceras de seguridad en Cloudflare
  (HSTS y Content-Security-Policy incluidas; si agregás un script o servicio externo, sumalo ahí).
- `public/404.html`: página de error real (las URLs inexistentes responden 404, no la home).

**Importante:** cuando tengan el dominio definitivo, ponelo en `siteUrl` dentro de `src/config.js`
(por ejemplo `"https://ardentium.com.py"`). Con eso se completan la URL canónica, la imagen al compartir
y el sitemap. También se puede definir como variable de entorno `SITE_URL` en Cloudflare.

Después de publicar:
1. Dar de alta el sitio en [Google Search Console](https://search.google.com/search-console) y enviar
   `https://TU-DOMINIO/sitemap.xml`.
2. Crear el perfil de empresa en Google (Google Business Profile) con la dirección en Asunción.
3. Probar la vista previa al compartir con el [depurador de Facebook](https://developers.facebook.com/tools/debug/)
   y los datos estructurados con la [prueba de resultados enriquecidos](https://search.google.com/test/rich-results).

## Lo primero que tenés que cambiar

**Número de WhatsApp y dominio** → `src/config.js`

```js
whatsapp: "595981123456",            // solo dígitos, con 595 y sin el 0 inicial
whatsappMessage: "Hola Ardentium, …", // mensaje que se precarga en el chat
```

Todos los botones de contacto y el número visible en la sección *Contacto* se actualizan solos.

## Estructura

```
index.html              contenido y estructura de la página
public/                 se copia tal cual al build: og.jpg, íconos, manifest, _headers, fotos grandes del equipo
scripts/
  vite-plugin-seo.js    completa las URLs de SEO y genera robots.txt, sitemap.xml y llms.txt
assets/
  favicon.svg           logo (monograma A forjada)
  fonts/                tipografías propias (woff2)
  team/                 fotos de los fundadores
  works/                capturas reales de MotelApp (sin logo del cliente) y Sabor del Chipá
src/
  config.js             WhatsApp, mensaje y dominio
  main.js               arma la página: hero, chispas y módulos de interfaz
  fx/
    loop.js             un solo requestAnimationFrame, que se duerme cuando nada se mueve
    forge.js            shader de metal fundido del hero (calor con el cursor, martillazo con el clic)
    sparks.js           chispas y brasas (Canvas 2D)
  ui/
    nav.js              barra, progreso de lectura, link activo, botón flotante y menú del celular
    reveal.js           entradas al hacer scroll, contadores, demo de KarúBox, proceso y tarjetas
    lightbox.js         ampliar capturas y fotos (galería con flechas, teclado y swipe)
  styles/
    main.css            punto de entrada (importa los demás)
    tokens.css          tipografías, colores, tamaños y tiempos de animación
    base.css            reset, contenedor, títulos de sección y entradas
    components.css      nav, menú móvil y botones
    sections.css        hero, marquesina, el nombre, servicios, trabajos, proceso, equipo, FAQ, contacto y pie
    overlays.css        lightbox y botón flotante de WhatsApp
```

## Efectos incluidos

Pocos y con un motivo cada uno: que se sienta la forja sin tapar el mensaje.

- **Hero WebGL:** la boca de una forja bajo el título. El cursor calienta el metal y un clic es un
  martillazo (onda expansiva y chispas). En el celular el fondo queda quieto y responde al toque.
  Al bajar, el metal se enfría. Sin WebGL, el mismo resplandor se pinta con CSS.
- **"vanguardia":** un filo incandescente recorre la palabra una vez cuando carga la página.
- **El nombre:** la tarjeta de elemento "Ad" (*ardens* + *-ium*, 1538 °C, el punto de fusión del hierro).
- **KarúBox:** demo animada del flujo pedido → impresión remota en cocina → ventas en vivo, una sola vez al aparecer.
- **MotelApp** y **Sabor del Chipá:** capturas reales en abanico; clic para ampliar.
- **Proceso:** riel de metal que se llena y enciende cada paso al llegar a la mitad de la pantalla.
- **Servicios:** punto de calor que sigue al cursor; en el celular se encienden al pasar por el centro.

Accesibilidad: respeta `prefers-reduced-motion` (sin animaciones ni partículas), tiene enlace para
saltar al contenido, foco visible y textos alternativos en las capturas. Sin JavaScript la página
se ve completa.

## Tipografías

Servidas desde el propio sitio (`assets/fonts/`, los mismos archivos y subconjuntos que entrega
Google Fonts, sin depender de un CSS externo que bloquee la carga): **Anybody** (títulos, fuente
variable de ancho), **Instrument Sans** (texto) y **JetBrains Mono** (etiquetas técnicas).
