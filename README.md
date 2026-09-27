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

La carpeta `dist/` se puede subir tal cual a Vercel, Netlify, Cloudflare Pages o cualquier hosting
estático (las rutas son relativas, funciona también dentro de una subcarpeta).

## Lo primero que tenés que cambiar

**Número de WhatsApp** → `src/config.js`

```js
whatsapp: "595981123456",            // solo dígitos, con 595 y sin el 0 inicial
whatsappMessage: "Hola Ardentium, …", // mensaje que se precarga en el chat
```

Todos los botones de contacto y el número visible en la sección *Contacto* se actualizan solos.

## Estructura

```
index.html              contenido y estructura de la página
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
    ticker.js           loop único + estado compartido de scroll y mouse
```

## Efectos incluidos

- Intro: el logo se dibuja, un pirómetro sube a 1538 °C (punto de fusión del hierro) y las
  puertas del horno se abren sobre el hero.
- Hero WebGL: metal fundido que reacciona al cursor (calor) y al clic (martillazo con onda
  expansiva, chispas y sacudida). El nombre ARDENTIUM se "vierte" de izquierda a derecha.
- Termómetro lateral: el scroll es temperatura, de 20 °C a 1538 °C.
- Marquesina que acelera y se inclina con la velocidad del scroll.
- Manifiesto que se calienta palabra por palabra.
- Títulos que entran angostos y fríos y se ensanchan al rojo vivo (fuente variable Anybody).
- Tarjeta de elemento químico "Ad" con tilt 3D y brillo.
- Tarjetas de servicios con punto de calor que sigue al cursor.
- KarúBox: animación pedido → impresión remota → dashboard, sincronizada con el scroll.
- MotelApp: capturas reales que se despliegan en 3D con el scroll y un láser de escaneo.
- Proceso con riel de metal fundido que se llena al bajar.
- Botones magnéticos, cursor de brasa, textos que se decodifican al pasar el mouse.

Accesibilidad: respeta `prefers-reduced-motion` (sin intro ni partículas), tiene enlace para
saltar al contenido, foco visible y textos alternativos en las capturas. Si WebGL no está
disponible, el nombre se muestra con un degradé de metal fundido en CSS.

## Tipografías

Se cargan desde Google Fonts: **Anybody** (títulos, fuente variable de ancho), **Instrument Sans**
(texto) y **JetBrains Mono** (etiquetas técnicas).
