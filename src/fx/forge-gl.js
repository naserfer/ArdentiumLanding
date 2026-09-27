/**
 * FORGE — molten‑metal field rendered with raw WebGL (no dependencies).
 *
 * Domain‑warped fbm noise builds a cooling crust with glowing veins; the value is mapped
 * through a black‑body ramp (the real colours of heated steel). The cursor is a heat source,
 * a click is a hammer strike (shock ring + white flash), and an optional wordmark is poured
 * into the field as liquid metal, igniting left to right.
 */
import { state, clamp, lerp, watchVisible } from "./ticker.js";

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * .5 + .5; gl_Position = vec4(aPos, 0., 1.); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHeat;
uniform vec4 uStrike;
uniform sampler2D uText;
uniform float uTextOn;
uniform float uIgnite;
uniform float uBase;
uniform float uScroll;
uniform vec2 uTC;
uniform vec2 uSq;
uniform vec2 uTexel;
varying vec2 vUv;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0., a = .5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= .5; }
  return v;
}
vec3 ramp(float t) {
  t = clamp(t, 0., 1.);
  vec3 c0 = vec3(.022, .014, .012), c1 = vec3(.15, .024, .008), c2 = vec3(.46, .075, .012);
  vec3 c3 = vec3(.82, .23, .03), c4 = vec3(1., .47, .11), c5 = vec3(1., .77, .42), c6 = vec3(1., .96, .88);
  if (t < .2) return mix(c0, c1, t / .2);
  if (t < .38) return mix(c1, c2, (t - .2) / .18);
  if (t < .55) return mix(c2, c3, (t - .38) / .17);
  if (t < .7) return mix(c3, c4, (t - .55) / .15);
  if (t < .85) return mix(c4, c5, (t - .7) / .15);
  return mix(c5, c6, (t - .85) / .15);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 p = (frag - .5 * uRes) / uRes.y;
  float t = uTime * .045;
  vec2 drift = vec2(0., uScroll * .8);

  vec2 q = vec2(fbm(p * 1.4 + vec2(0., t) + drift), fbm(p * 1.4 + vec2(5.2, 1.3 - t)));
  vec2 r = vec2(fbm(p * 1.8 + 3. * q + vec2(1.7, 9.2) + .8 * t), fbm(p * 1.8 + 3. * q + vec2(8.3, 2.8) - .6 * t));
  float f = fbm(p * 2. + 2.4 * r);
  float veins = 1. - abs(fbm(p * 3.1 + 1.6 * r + vec2(t * .6, 0.) + drift) * 2. - 1.);
  veins = pow(veins, 9.);

  float floorHeat = smoothstep(1.0, -.15, vUv.y);
  float temp = f * .24 + veins * .44 * (.28 + .72 * floorHeat) + floorHeat * .09;
  temp *= uBase;

  vec2 m = (uMouse - .5 * uRes) / uRes.y;
  float md = length(p - m);
  temp += uHeat * (.42 * exp(-md * md * 16.) + veins * .7 * exp(-md * md * 3.5));

  // the metal cools as the hero scrolls away
  float cool = 1. - uScroll * .6;
  temp *= cool;

  if (uTextOn > .0) {
    vec2 tuv = uTC + (vUv - uTC) / uSq;
    // heat shimmer: the air above molten metal wobbles
    tuv.y += (noise(vec2(tuv.x * 38., uTime * 1.6)) - .5) * .0035;
    tuv.x += (noise(vec2(tuv.y * 30., uTime * 1.3 + 7.)) - .5) * .002;
    vec4 tx = texture2D(uText, tuv);
    float ign = smoothstep(tuv.x, tuv.x + .12, uIgnite * 1.14);
    float inside = tx.r * ign;

    // the mould: a dark, cooled rim so the letters read against the veins
    float moat = smoothstep(.05, .55, tx.g) * (1. - tx.r) * ign;
    temp *= 1. - moat * .72;
    temp += tx.g * (1. - tx.r) * ign * .16;

    // cast‑metal bevel: normal from the narrow blur (B), lit by the cursor
    vec2 o = uTexel * 2.;
    float bx = texture2D(uText, tuv + vec2(o.x, 0.)).b - texture2D(uText, tuv - vec2(o.x, 0.)).b;
    float by = texture2D(uText, tuv + vec2(0., o.y)).b - texture2D(uText, tuv - vec2(0., o.y)).b;
    vec3 n = normalize(vec3(-bx * 3.2, -by * 3.2, 1.));
    vec3 L = normalize(vec3(m - p, .55));
    float diff = max(dot(n, L), 0.);
    float spec = pow(max(dot(reflect(-L, n), vec3(0., 0., 1.)), 0.), 22.);

    float mf = fbm(p * 4.2 + vec2(t * 3., -t * 6.) + 2. * r);
    float textTemp = .5 + .34 * mf + .1 * veins;
    textTemp *= .78 + .3 * diff;
    textTemp += spec * (.35 + .5 * uHeat) + uHeat * .12 * exp(-md * md * 5.);
    temp = mix(temp, textTemp * mix(1., cool, .5), inside);

    // bright pouring front while the word fills
    float ie = (tuv.x - (uIgnite * 1.14 - .06)) * 16.;
    temp += exp(-ie * ie) * tx.g * step(uIgnite, .999) * .9;
  }

  if (uStrike.w > 0.) {
    vec2 sp = (uStrike.xy - .5 * uRes) / uRes.y;
    float sd = length(p - sp);
    float rr = (sd - uStrike.z * 1.05) * 20.;
    float ring = exp(-rr * rr) * exp(-uStrike.z * 2.4);
    float flash = exp(-sd * 16.) * exp(-uStrike.z * 7.);
    temp += (ring * .55 + flash * .6) * uStrike.w;
  }

  vec3 col = ramp(temp);
  float vig = smoothstep(1.4, .2, length(p * vec2(.72, 1.)));
  col *= mix(.5, 1., vig);
  col += (hash(frag + fract(uTime) * 91.7) - .5) * .022;
  gl_FragColor = vec4(col, 1.);
}
`;

export class Forge {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ textEl?: HTMLElement, text?: string, base?: number, interactive?: boolean }} opts
   */
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.opts = { base: 1, interactive: true, ...opts };
    this.ok = false;
    this.visible = false;
    this.quality = state.mobile ? 0.5 : 0.72;
    this.frameTimes = [];
    this.heat = 0.35;
    this.heatTarget = 0.35;
    this.mx = 0; this.my = 0;           // smoothed mouse in canvas px
    this.tx = 0; this.ty = 0;           // target mouse
    this.hasPointer = false;
    this.ignite = opts.textEl ? 0 : 1;
    this.strike = { x: 0, y: 0, age: 9, power: 0 };
    this.sq = { x: 1, y: 1, vx: 0, vy: 0 };
    this.scrollK = 0;

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
    if (!gl) return;
    this.gl = gl;
    if (!this.#program()) return;
    this.#geometry();
    this.#textTexture();
    this.ok = true;

    this.resize();
    // resize lazily at the start of the next frame, so a resized canvas is never presented blank
    new ResizeObserver(() => { this.dirty = true; }).observe(canvas);
    watchVisible(canvas, (v) => { this.visible = v; }, "80px");
  }

  #program() {
    const { gl } = this;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    const pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(pr)); return false; }
    gl.useProgram(pr);
    this.pr = pr;
    this.u = {};
    for (const n of ["uRes", "uTime", "uMouse", "uHeat", "uStrike", "uText", "uTextOn", "uIgnite", "uBase", "uScroll", "uTC", "uSq", "uTexel"]) {
      this.u[n] = gl.getUniformLocation(pr, n);
    }
    return true;
  }

  #geometry() {
    const { gl } = this;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.pr, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  #textTexture() {
    const { gl } = this;
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    this.textCanvas = document.createElement("canvas");
  }

  /** Paints the wordmark (R = letters, G = soft glow) aligned to opts.textEl, then uploads it. */
  drawText() {
    const el = this.opts.textEl;
    if (!this.ok || !el) return;
    const tc = this.textCanvas;
    const cr = this.canvas.getBoundingClientRect();
    // texture resolution follows the CSS size (capped), not the adaptive render size
    const k = Math.min(1, 1400 / Math.max(1, cr.width));
    tc.width = Math.max(2, Math.round(cr.width * k));
    tc.height = Math.max(2, Math.round(cr.height * k));
    const ctx = tc.getContext("2d");
    const er = el.getBoundingClientRect();
    const sx = tc.width / cr.width, sy = tc.height / cr.height;
    const box = { x: (er.left - cr.left) * sx, y: (er.top - cr.top) * sy, w: er.width * sx, h: er.height * sy };

    const word = this.opts.text || "ARDENTIUM";
    const family = "Anybody, 'Arial Black', 'Helvetica Neue', Arial, sans-serif";
    const setFont = (px) => {
      ctx.font = `900 ${px}px ${family}`;
      if ("fontStretch" in ctx) ctx.fontStretch = "extra-expanded";
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${-px * 0.01}px`;
    };
    setFont(100);
    const m = ctx.measureText(word);
    const capH = (m.actualBoundingBoxAscent || 72) + (m.actualBoundingBoxDescent || 0);
    let size = Math.min((box.w / m.width) * 100, (box.h / capH) * 100 * 0.98);
    setFont(size);
    const m2 = ctx.measureText(word);
    const asc = m2.actualBoundingBoxAscent || size * 0.72;
    const desc = m2.actualBoundingBoxDescent || 0;
    const x = box.x + (box.w - m2.width) / 2;
    const y = box.y + (box.h + asc - desc) / 2;

    ctx.clearRect(0, 0, tc.width, tc.height);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, tc.width, tc.height);
    ctx.globalCompositeOperation = "lighter";
    // glow via an offset shadow so only the blur lands on the canvas (works in every browser)
    const off = tc.width * 3;
    ctx.shadowOffsetX = off;
    ctx.shadowColor = "rgb(0,255,0)";
    ctx.fillStyle = "rgb(0,255,0)";
    for (const [blur, reps] of [[size * 0.35, 1], [size * 0.12, 2]]) {
      ctx.shadowBlur = blur;
      for (let i = 0; i < reps; i++) ctx.fillText(word, x - off, y);
    }
    // B = a narrow blur of the letters, used as a height map for the bevel
    ctx.shadowColor = "rgb(0,0,255)";
    ctx.fillStyle = "rgb(0,0,255)";
    ctx.shadowBlur = Math.max(2, size * 0.045);
    ctx.fillText(word, x - off, y);
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowColor = "transparent";
    ctx.fillStyle = "rgb(255,0,0)";
    ctx.fillText(word, x, y);
    ctx.globalCompositeOperation = "source-over";

    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tc);
    // hammer squash pivots around the word's centre (uv space, y up)
    this.tc = [(box.x + box.w / 2) / tc.width, 1 - (box.y + box.h / 2) / tc.height];
    this.texel = [1 / tc.width, 1 / tc.height];
    this.textReady = true;
    this.still = false;
  }

  resize() {
    if (!this.ok) return;
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.max(2, Math.round(r.width * dpr * this.quality));
    const h = Math.max(2, Math.round(r.height * dpr * this.quality));
    if (w !== this.canvas.width || h !== this.canvas.height) {
      const sx = w / this.canvas.width, sy = h / this.canvas.height;
      this.canvas.width = w; this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
      this.still = false;
      // keep pointer + strike positions in the new pixel space
      this.mx *= sx; this.tx *= sx; this.my *= sy; this.ty *= sy;
      this.strike.x *= sx; this.strike.y *= sy;
      if (!this.hasPointer && !this._placed) { this._placed = true; this.tx = this.mx = w * 0.62; this.ty = this.my = h * 0.45; }
    }
    const cssKey = `${Math.round(r.width)}x${Math.round(r.height)}`;
    if (cssKey !== this.cssKey) { this.cssKey = cssKey; this.drawText(); }
  }

  /** client coords → canvas px (y up) */
  toCanvas(cx, cy) {
    const r = this.canvas.getBoundingClientRect();
    return [((cx - r.left) / r.width) * this.canvas.width, (1 - (cy - r.top) / r.height) * this.canvas.height];
  }

  pointer(cx, cy) {
    [this.tx, this.ty] = this.toCanvas(cx, cy);
    this.hasPointer = true;
    this.heatTarget = 1;
    clearTimeout(this._cool);
    this._cool = setTimeout(() => { this.heatTarget = 0.45; }, 900);
  }

  hammer(cx, cy) {
    const [x, y] = this.toCanvas(cx, cy);
    this.strike = { x, y, age: 0, power: 1 };
    this.sq.x = 1.07; this.sq.y = 0.86;   // flatten, then spring back
  }

  render(s) {
    if (!this.ok || !this.visible) return;
    if (this.dirty) { this.dirty = false; this.resize(); }
    // reduced motion: paint one still frame (again only after a resize / text change)
    if (state.reduced) { if (this.still) return; this.still = true; }
    const t0 = performance.now();
    const { gl, u } = this;

    // ambient wandering heat when nobody is pointing (touch, idle)
    if (!this.hasPointer || state.reduced) {
      const W = this.canvas.width, H = this.canvas.height;
      this.tx = W * (0.5 + 0.3 * Math.sin(s.time * 0.35));
      this.ty = H * (0.45 + 0.2 * Math.sin(s.time * 0.5 + 1.3));
    }
    this.mx = lerp(this.mx, this.tx, 0.08);
    this.my = lerp(this.my, this.ty, 0.08);
    this.heat = lerp(this.heat, this.heatTarget, 0.04);
    this.strike.age += s.dt;
    // critically damped spring for the squash
    for (const k of ["x", "y"]) {
      const f = (1 - this.sq[k]) * 180 - this.sq["v" + k] * 16;
      this.sq["v" + k] += f * s.dt;
      this.sq[k] += this.sq["v" + k] * s.dt;
    }
    const rect = this.canvas.getBoundingClientRect();
    this.scrollK = clamp(-rect.top / Math.max(1, rect.height));

    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uTime, s.time + 40);
    gl.uniform2f(u.uMouse, this.mx, this.my);
    gl.uniform1f(u.uHeat, this.heat);
    gl.uniform4f(u.uStrike, this.strike.x, this.strike.y, this.strike.age, this.strike.age < 3 ? this.strike.power : 0);
    gl.uniform1f(u.uTextOn, this.textReady ? 1 : 0);
    gl.uniform1f(u.uIgnite, this.ignite);
    gl.uniform1f(u.uBase, this.opts.base);
    gl.uniform1f(u.uScroll, this.scrollK);
    gl.uniform2f(u.uTC, this.tc ? this.tc[0] : 0.5, this.tc ? this.tc[1] : 0.5);
    gl.uniform2f(u.uSq, this.sq.x, this.sq.y);
    gl.uniform2f(u.uTexel, this.texel ? this.texel[0] : 0.001, this.texel ? this.texel[1] : 0.001);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(u.uText, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.#adapt(performance.now() - t0, s.dt);
  }

  /** Drop internal resolution if frames are slow; this keeps 60 fps on weaker GPUs. */
  #adapt(cpuMs, dt) {
    this.frameTimes.push(dt * 1000);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    if (avg > 24 && this.quality > 0.36) { this.quality = Math.max(0.36, this.quality - 0.12); this.dirty = true; }
  }
}
