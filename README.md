# Ardentium · Landing

Landing page de **Ardentium**, fábrica de desarrollo (Asunción, Paraguay). Lema: *Vanguardia*.

Hecha sin dependencias de runtime: el fondo de metal fundido es **WebGL puro** (shader propio),
las chispas son un sistema de partículas en Canvas 2D y todas las animaciones corren en un único
`requestAnimationFrame`. Resultado: carga liviana y 60 fps sin librerías externas.

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
- Datos estructurados (schema.org): organización, fundadores, servicios, KarúBox, MotelApp y las
  preguntas frecuentes.
- Sección de preguntas frecuentes con contenido que responde búsquedas reales.
- `robots.txt`, `sitemap.xml` y `llms.txt` (para buscadores con IA) que se generan en cada build.
- Íconos para iPhone y Android, `favicon.ico` y `site.webmanifest`.
- `public/_headers`: caché larga para los archivos del build y cabeceras de seguridad en Cloudflare.

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
public/                 se copia tal cual al build: og.jpg, íconos, manifest, _headers
scripts/
  vite-plugin-seo.js    completa las URLs de SEO y genera robots.txt, sitemap.xml y llms.txt
assets/
  favicon.svg           logo (monograma A forjada)
  works/                capturas reales de MotelApp (sin logo del cliente)
src/
  config.js             WhatsApp y mensaje
  main.js               arma todo y corre el loop de animación
  styles/main.css       diseño: tokens de color, tipografía y secciones
  fx/
    forge-gl.js         shader de metal fundido + wordmark de metal líquido
    sparks.js           chispas y brasas
    preloader.js        intro "encendiendo la forja"
    scroll.js           nav, termómetro, marquesina, manifiesto, casos y proceso
    reveal.js           entradas al hacer scroll y títulos "martillados"
    interact.js         botones magnéticos, tilt 3D, spotlight, contadores
    cursor.js           cursor de brasa
    lightbox.js         ampliar capturas de MotelApp
    footer.js           wordmark gigante del pie que se funde bajo el cursor
    ticker.js           loop único + estado compartido de scroll y mouse
```

## Efectos incluidos

- **Intro:** el logo se dibuja, un pirómetro sube a 1538 °C (punto de fusión del hierro) y las
  puertas del horno se abren sobre el hero.
- **Hero WebGL:** metal fundido que reacciona al cursor (calor) y al clic (martillazo con onda
  expansiva, chispas y sacudida). ARDENTIUM se "vierte" de izquierda a derecha y queda como
  metal colado: relieve con luz que sigue al cursor, molde oscuro alrededor, metal líquido
  por dentro y temblor de calor. Al bajar, el metal se enfría.
- **Logo integrado:** la A forjada es la primera letra de ARDENTIUM (barra y pie).
- **Termómetro lateral y barra de progreso en la nav:** el scroll es temperatura, de 20 °C a 1538 °C.
- **Marquesina doble:** servicios y tecnologías en sentidos opuestos; acelera y se inclina con el scroll.
- **Manifiesto** que se calienta palabra por palabra y tarjeta de elemento "Ad" con tilt 3D.
- **Títulos martillados:** entran angostos y fríos y se ensanchan al rojo vivo (fuente variable).
- **Servicios:** punto de calor que sigue al cursor; en el celular se encienden al pasar por el centro.
- **KarúBox:** pedido → impresión remota (el ticket sale de la impresora, el LED parpadea) →
  ventas que suben en vivo, con pasos 1‑2‑3 sincronizados con el scroll.
- **MotelApp:** capturas reales que se despliegan en 3D, láser de escaneo y clic para ampliar.
- **Proceso:** riel de metal fundido que se llena y enciende cada paso.
- **Contacto:** la lava del fondo se calienta a medida que te acercás.
- **Pie:** wordmark gigante en contorno que se funde donde pasa el cursor.
- Botones magnéticos, cursor de brasa, textos que se decodifican al pasar el mouse.

Accesibilidad: respeta `prefers-reduced-motion` (sin intro ni partículas), tiene enlace para
saltar al contenido, foco visible y textos alternativos en las capturas. Si WebGL no está
disponible, el nombre se muestra con un degradé de metal fundido en CSS.

## Tipografías

Se cargan desde Google Fonts: **Anybody** (títulos, fuente variable de ancho), **Instrument Sans**
(texto) y **JetBrains Mono** (etiquetas técnicas).
