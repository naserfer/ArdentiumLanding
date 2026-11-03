/**
 * FORGE — the hero's molten ground, raw WebGL (no dependencies).
 *
 * Mostly black, with the contained glow of a forge mouth just below the frame, bent by hot air.
 * Colours follow the black‑body ramp of heated steel (the same palette as the CSS tokens).
 * The cursor warms the metal under it and a click is a hammer strike (shock ring + flash).
 * On touch screens and with reduced motion the ground holds still: it only redraws for a strike.
 */
import { state, lerp, watchVisible } from "./loop.js";

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
uniform float uCool;
varying vec2 vUv;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}
// black-body ramp: carbón → escoria → rojo cereza → naranja fundido → oro → blanco vivo
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
float forgeHeat(vec2 uv, float asp, float t) {
  vec2 h = vec2(noise(vec2(uv.x * 7., uv.y * 5. - t * .8)), noise(vec2(uv.x * 6. + 3.1, uv.y * 4. - t * .65))) - .5;
  vec2 q = uv + h * .03 * smoothstep(.7, 0., uv.y);
  float x = (q.x - .58) * asp;
  float wide = exp(-(x * x * .45 + (q.y + .05) * (q.y + .05) * 14.));
  float core = exp(-(x * x * 2.2 + (q.y + .01) * (q.y + .01) * 50.));
  float coals = .8 + .4 * noise(vec2(x * 2.4 + t * .05, q.y * 3. - t * .22));
  return (wide * .3 + core * .16) * coals * (.95 + .05 * sin(t * 1.7 + sin(t * .63) * 2.));
}
float strikeHeat(vec2 p) {
  if (uStrike.w <= 0.) return 0.;
  vec2 sp = (uStrike.xy - .5 * uRes) / uRes.y;
  float sd = length(p - sp);
  float rr = (sd - uStrike.z * 1.05) * 20.;
  return (exp(-rr * rr) * exp(-uStrike.z * 2.4) * .3 + exp(-sd * 16.) * exp(-uStrike.z * 7.) * .35) * uStrike.w;
}
void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 p = (frag - .5 * uRes) / uRes.y;
  vec2 m = (uMouse - .5 * uRes) / uRes.y;
  float md = length(p - m);
  float h = forgeHeat(vUv, uRes.x / uRes.y, uTime) + strikeHeat(p) + uHeat * .05 * exp(-md * md * 6.);
  vec3 col = ramp(h * (1. - uCool * .55));
  float vig = smoothstep(1.5, .25, length(p * vec2(.7, 1.)));
  col *= mix(.6, 1., vig);
  col += (hash(frag + fract(uTime) * 91.7) - .5) * .014;
  gl_FragColor = vec4(col, 1.);
}
`;

const UNIFORMS = ["uRes", "uTime", "uMouse", "uHeat", "uStrike", "uCool"];

export class Forge {
  constructor(canvas) {
    this.canvas = canvas;
    this.ok = false;
    this.visible = true;
    this.animated = state.pointerFine && !state.reduced;   // touch / reduced motion: a still ground
    this.quality = state.mobile ? 0.6 : 0.8;
    this.heat = 0;
    this.heatTarget = 0;
    this.mx = 0; this.my = 0; this.tx = 0; this.ty = 0;
    this.strike = { x: 0, y: 0, age: 9 };
    this.dirty = true;       // something changed since the last frame (only matters when still)
    this.slow = 0;

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) return;
    this.gl = gl;
    if (!this.#program()) return;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.ok = true;

    this.resize();
    new ResizeObserver(() => { this.needsResize = true; this.dirty = true; }).observe(canvas);
    watchVisible(canvas, (v) => { this.visible = v; this.dirty = true; }, "60px");
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this.ok = false; this.onfail?.(); });
  }

  #program() {
    const { gl } = this;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    const pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs);
    gl.bindAttribLocation(pr, 0, "aPos");
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.warn(gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(pr)); return false; }
    gl.useProgram(pr);
    this.u = Object.fromEntries(UNIFORMS.map((n) => [n, gl.getUniformLocation(pr, n)]));
    return true;
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.max(2, Math.round(r.width * dpr * this.quality));
    const h = Math.max(2, Math.round(r.height * dpr * this.quality));
    if (w === this.canvas.width && h === this.canvas.height) return;
    const sx = w / this.canvas.width, sy = h / this.canvas.height;
    this.canvas.width = w; this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
    if (!this.placed) { this.placed = true; this.tx = this.mx = w * 0.62; this.ty = this.my = h * 0.45; }
    else { this.mx *= sx; this.tx *= sx; this.my *= sy; this.ty *= sy; this.strike.x *= sx; this.strike.y *= sy; }
  }

  /** client coords → canvas px (y up) */
  #toCanvas(cx, cy) {
    const r = this.canvas.getBoundingClientRect();
    return [((cx - r.left) / r.width) * this.canvas.width, (1 - (cy - r.top) / r.height) * this.canvas.height];
  }

  pointer(cx, cy) {
    [this.tx, this.ty] = this.#toCanvas(cx, cy);
    this.heatTarget = 1;
    clearTimeout(this.coolTimer);
    this.coolTimer = setTimeout(() => { this.heatTarget = 0.45; }, 900);
  }

  hammer(cx, cy) {
    const [x, y] = this.#toCanvas(cx, cy);
    this.strike = { x, y, age: 0 };
  }

  /** Draws a frame; returns whether it needs the next one. */
  render(s) {
    if (!this.ok || !this.visible) return false;
    const striking = this.strike.age < 3;
    if (!this.animated && !striking && !this.dirty) return false;
    this.dirty = false;
    if (this.needsResize) { this.needsResize = false; this.resize(); }

    this.mx = lerp(this.mx, this.tx, 0.08);
    this.my = lerp(this.my, this.ty, 0.08);
    this.heat = lerp(this.heat, this.heatTarget, 0.04);
    this.strike.age += s.dt;
    const r = this.canvas.getBoundingClientRect();
    const cool = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));

    const { gl, u } = this;
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uTime, this.animated ? s.time + 40 : 47);
    gl.uniform2f(u.uMouse, this.mx, this.my);
    gl.uniform1f(u.uHeat, this.heat);
    gl.uniform4f(u.uStrike, this.strike.x, this.strike.y, this.strike.age, striking ? 1 : 0);
    gl.uniform1f(u.uCool, cool);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // weaker GPUs: drop the internal resolution once if frames are consistently slow
    if (this.animated && this.quality > 0.4) {
      this.slow = s.dt > 0.024 ? this.slow + 1 : Math.max(0, this.slow - 1);
      if (this.slow > 90) { this.slow = 0; this.quality -= 0.15; this.needsResize = true; }
    }
    return this.animated || striking;
  }
}
