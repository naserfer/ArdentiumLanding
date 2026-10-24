/**
 * INTRO SCENE — drawn with the hero's own WebGL context (no third context).
 *
 * A brushed‑steel plate in the dark, lit by one incandescent point with a real inverse‑square
 * fall‑off; metallic dust only shows inside that light. The point opens into a molten crack that
 * runs along the real outline of the mark (the paths of <symbol id="mark">), fills it, takes a
 * hammer blow and solidifies into the forged piece. The wordmark rises as cold iron out of a cut,
 * and a heat front finally burns the plate away onto the forge field underneath.
 *
 * Textures (built once on 2D canvases from the paths of #mark):
 *   uMark   R = fill, G = wide glow, B = narrow blur (bevel height + outline band)
 *   uArr    R = arrival time of the crack along the outline (0 → 1)
 *   uSolidTex  the mark in its brand colours (same gradients as the SVG), so the forged piece
 *           matches the SVG it hands over to, pixel for pixel
 */
import { VERT, GLSL_COMMON } from "./forge-gl.js";

const INTRO_FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uLight;
uniform float uLightK;
uniform float uCore;
uniform vec2 uMouse;
uniform float uHeat;
uniform sampler2D uMark;
uniform sampler2D uArr;
uniform sampler2D uSolidTex;
uniform sampler2D uText;
uniform vec4 uMarkBox;
uniform float uCrack;
uniform float uFill;
uniform float uHot;
uniform float uSolid;
uniform float uSweep;
uniform float uMarkOn;
uniform float uRise;
uniform vec4 uGlyph;
uniform vec2 uTexel;
uniform float uReveal;
uniform vec4 uStrike;
uniform float uFlash;
varying vec2 vUv;
${GLSL_COMMON}

// fixed points of the black‑body ramp (constants compile to nothing)
const vec3 HOT62 = vec3(.900, .330, .060);
const vec3 HOT72 = vec3(1., .510, .150);
const vec3 HOT80 = vec3(1., .670, .310);

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 p = (frag - .5 * uRes) / uRes.y;
  vec2 lp = (uLight - .5 * uRes) / uRes.y;
  vec2 mp = (uMouse - .5 * uRes) / uRes.y;
  vec2 toUv = vec2(uRes.y / uRes.x, 1.);

  // ---- heat haze: hot air above the molten mark bends what is behind it
  vec2 muv0 = (vUv - uMarkBox.xy) / uMarkBox.zw;
  // glow only where the metal has already arrived (never reveal the whole shape ahead of the crack)
  float arr0 = texture2D(uArr, muv0).r;
  float glow0 = texture2D(uMark, muv0).g * smoothstep(uCrack + .04, uCrack - .14, arr0);
  float heatLvl = (max(smoothstep(0., .3, uCrack), uFill) * (1. - uSolid) + uHot) * uMarkOn;
  vec2 disp = vec2(noise(vec2(p.x * 24., p.y * 9. - uTime * 2.4)), noise(vec2(p.x * 19. + 4., p.y * 11. - uTime * 2.))) - .5;
  disp *= .011 * glow0 * heatLvl;
  vec2 pd = p + disp;
  vec2 muv = (vUv + disp * toUv - uMarkBox.xy) / uMarkBox.zw;

  // ---- the plate: brushed steel (grooves run horizontally)
  float brush = noise(vec2(pd.x * 5., pd.y * 380.)) * .6 + noise(vec2(pd.x * 2.1 + 9., pd.y * 860.)) * .4;
  float fine = noise(vec2(pd.x * 9., pd.y * 1400.));
  vec3 albedo = vec3(.15, .142, .135) * (.72 + .56 * brush);

  // one point light hovering over the plate, inverse‑square fall‑off (E = I·h / d³)
  vec2 dl = pd - lp;
  float d2 = dot(dl, dl);
  float h = .17;
  float E = uLightK * pow(h * h / (d2 + h * h), 1.5);
  // the molten mark itself lights the plate around it
  E += glow0 * heatLvl * .3;
  // the hammer blow sends a ring of light across the plate
  if (uStrike.w > 0.) {
    vec2 sp = (uStrike.xy - .5 * uRes) / uRes.y;
    float rr = (length(p - sp) - uStrike.z * 1.25) * 14.;
    E += exp(-rr * rr) * exp(-uStrike.z * 2.2) * .9 * uStrike.w;
  }
  vec3 lightCol = mix(vec3(1., .42, .13), vec3(1., .78, .55), clamp(uLightK, 0., 1.));
  // anisotropic highlight: brushed metal stretches the reflection across the grooves
  float spec = exp(-dl.x * dl.x * 70. - dl.y * dl.y * 2.6) * uLightK * (.35 + .9 * fine);
  vec3 col = albedo * E * lightCol + spec * .32 * lightCol + vec3(.006, .005, .004);

  // metallic dust drifting in the air, visible only where the light reaches it
  float dust = 0.;
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    vec2 q = p * (34. + fi * 22.) + vec2(uTime * (.25 + fi * .2), uTime * (.55 - fi * .15));
    vec2 id = floor(q), f = fract(q) - .5;
    float r = hash(id + fi * 17.);
    if (r > .955) {
      vec2 o = (vec2(hash(id + 3.1), hash(id + 7.7)) - .5) * .7;
      float tw = .6 + .4 * sin(uTime * (1.3 + r * 2.) + r * 40.);
      dust += smoothstep(.09, 0., length(f - o)) * tw;
    }
  }
  col += dust * pow(clamp(E, 0., 1.4), 1.6) * lightCol * .55;

  // the incandescent point
  vec2 dc = p - lp;
  float dd = dot(dc, dc);
  col += mix(HOT72, vec3(1., .96, .88), uCore) * (exp(-dd * 2600.) * 1.3 + exp(-dd * 140.) * .22) * uCore;

  // ---- the mark
  if (uMarkOn > 0. && muv.x > 0. && muv.x < 1. && muv.y > 0. && muv.y < 1.) {
    vec4 mk = texture2D(uMark, muv);
    float arr = texture2D(uArr, muv).r;
    float band = pow(1. - abs(mk.b * 2. - 1.), 3.) * step(.015, mk.b);
    float crack = band * smoothstep(uCrack + .004, uCrack - .02, arr);
    float fillA = mk.r * smoothstep(uFill + .02, uFill - .05, arr);
    float flow = noise(pd * 38. + vec2(0., -uTime * 1.6));
    float md = length(p - mp);
    float tip = exp(-max(uCrack - arr, 0.) * 7.);
    float tCrack = .6 + .33 * tip + .08 * flow;
    float tFill = .56 + .16 * flow + .1 * exp(-max(uFill - arr, 0.) * 6.);
    float mT = max(crack * tCrack, fillA * tFill) + uHeat * .18 * exp(-md * md * 40.) * max(crack, fillA);
    mT += uHot * .45 * mk.r;
    float cov = max(crack, fillA);
    float glowA = mk.g * smoothstep(uCrack + .04, uCrack - .14, arr);

    // forged: the brand mark itself (its own gradients and dark slot), lit once by a passing specular band
    vec4 sc = texture2D(uSolidTex, muv);
    vec3 forged = mix(col, sc.rgb, sc.a);
    float sw = exp(-pow((muv.x + (1. - muv.y) * .55 - uSweep) * 7., 2.));
    forged += vec3(1., .97, .9) * sw * mk.r * .32;

    // molten metal replaces the plate where it flows; its glow spills around it
    vec3 hotCol = mix(col, ramp(mT), cov) + HOT62 * glowA * (1. - cov) * .3 * heatLvl;
    col = mix(col, mix(hotCol, forged, uSolid), uMarkOn);
  }

  // ---- the wordmark rises as cold iron out of a cut
  if (uRise > 0.) {
    float gh = uGlyph.w - uGlyph.y;
    vec2 tuv = vUv + vec2(0., (1. - uRise) * gh * 1.08);
    vec4 tx = texture2D(uText, tuv);
    float clipCut = smoothstep(uGlyph.y - .003, uGlyph.y + .001, vUv.y);
    vec3 n = letterNormal(uText, tuv, uTexel);
    col = mix(col, coldIron(n, p, lp, .6 + .4 * uLightK), tx.r * clipCut);
    // the lip of the cut glows while the letters pass through it
    float inX = step(uGlyph.x, vUv.x) * step(vUv.x, uGlyph.z);
    float lip = exp(-pow((vUv.y - uGlyph.y) * uRes.y * .35, 2.)) * inX * uRise * (1. - uRise) * 4.;
    col += HOT72 * lip * .8;
  }

  // flash of the blow
  col += vec3(1., .88, .74) * uFlash * .14;

  float vig = smoothstep(1.4, .2, length(p * vec2(.72, 1.)));
  col *= mix(.5, 1., vig);
  col += (hash(frag + fract(uTime) * 91.7) - .5) * .022;

  // ---- reveal: a heat front burns the plate away onto the forge field (drawn underneath)
  float a = 1.;
  if (uReveal > -.24) {
    float fx = uReveal + (noise(vec2(vUv.y * 5., uTime * .7)) - .5) * .1 + (noise(vec2(vUv.y * 23., 3.)) - .5) * .025;
    a = smoothstep(fx - .006, fx + .028, vUv.x);
    float line = exp(-pow((vUv.x - fx) * 48., 2.));
    // blended over the field: col·a + field·(1 − a); the front itself is a white‑gold seam
    col = mix(HOT80, col, a);
    a = max(a, line * .85);
  }
  gl_FragColor = vec4(col, a);
}
`;

const NAMES = ["uRes", "uTime", "uLight", "uLightK", "uCore", "uMouse", "uHeat", "uMark", "uArr", "uSolidTex", "uText", "uMarkBox", "uCrack", "uFill", "uHot", "uSolid", "uSweep", "uMarkOn", "uRise", "uGlyph", "uTexel", "uReveal", "uStrike", "uFlash"];

/** Reads the real geometry of the brand mark from the SVG sprite. */
function markGeometry() {
  const sym = document.getElementById("mark");
  const paths = sym ? [...sym.querySelectorAll("path")] : [];
  const rects = sym ? [...sym.querySelectorAll("rect")] : [];
  const r = (el) => el && ["x", "y", "width", "height", "rx"].map((k) => +el.getAttribute(k) || 0);
  return {
    sym,
    legs: paths[0] ? paths[0].getAttribute("d") : "M44 17 L56 17 L95 95 L76 95 L50 43 L24 95 L5 95 Z",
    flame: (sym && sym.querySelector(".mark-flame")?.getAttribute("d")) || "M50 0 C54.5 5 56 9.5 50 14 C44 9.5 45.5 5 50 0Z",
    slot: r(rects.find((e) => !e.classList.contains("mark-ingot"))) || [26, 63, 48, 13, 2.5],
    ingot: r(sym && sym.querySelector(".mark-ingot")) || [29, 66, 42, 7, 1.8],
  };
}

const PAD = 20, SPAN = 140; // the texture covers viewBox −20…120 so the glow fits

function makeTex(gl, src) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  return t;
}

/** Polygon vertices of an M/L/Z path. */
const polyPoints = (d) => (d.match(/-?\d*\.?\d+/g) || []).map(Number).reduce((a, v, i) => { if (i % 2) a[a.length - 1].push(v); else a.push([v]); return a; }, []);

function buildTextures(gl, N) {
  const g = markGeometry();
  const sc = N / SPAN;
  const cv = () => { const c = document.createElement("canvas"); c.width = c.height = N; return c; };
  const view = (ctx) => ctx.setTransform(sc, 0, 0, sc, PAD * sc, PAD * sc);
  const roundRect = (ctx, [x, y, w, h, rx]) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, rx); else ctx.rect(x, y, w, h); };
  const legs = new Path2D(g.legs), flame = new Path2D(g.flame);

  // shape mask: legs − slot + ingot + flame (exactly how the symbol is layered)
  const shape = cv();
  const s = shape.getContext("2d");
  view(s);
  s.fillStyle = "#f00";
  s.fill(legs);
  s.globalCompositeOperation = "destination-out";
  roundRect(s, g.slot); s.fill();
  s.globalCompositeOperation = "source-over";
  roundRect(s, g.ingot); s.fill();
  s.fill(flame);

  // R fill, G wide glow, B narrow blur — glows are offset shadows, so only the blur lands
  const mark = cv();
  const m = mark.getContext("2d");
  m.fillStyle = "#000"; m.fillRect(0, 0, N, N);
  m.globalCompositeOperation = "lighter";
  const off = N * 3;
  m.shadowOffsetX = off;
  for (const [color, blur] of [["rgb(0,255,0)", N * 0.07], ["rgb(0,255,0)", N * 0.025], ["rgb(0,0,255)", N * 0.012]]) {
    m.shadowColor = color; m.shadowBlur = blur;
    m.drawImage(shape, -off, 0);
  }
  m.shadowColor = "transparent"; m.shadowBlur = 0; m.shadowOffsetX = 0;
  m.drawImage(shape, 0, 0);

  // arrival: the crack starts at the apex of the hollow (50,43), runs both ways round the A,
  // meets under the flame, lights the flame bottom‑up and finally crosses the ingot from its middle
  const arr = cv();
  const a = arr.getContext("2d");
  a.fillStyle = "rgb(255,0,0)"; a.fillRect(0, 0, N, N);
  view(a);
  const P = polyPoints(g.legs);
  const apex = P.reduce((best, q, i) => (q[1] > 30 && Math.abs(q[0] - 50) < 1 ? i : best), 4);
  const top = [(P[0][0] + P[1][0]) / 2, (P[0][1] + P[1][1]) / 2];
  const n = P.length;
  const branch = (dir) => {
    const pts = [P[apex]];
    for (let k = 1; k < n; k++) {
      const i = (apex + dir * k + n) % n;
      pts.push(P[i]);
      if ((dir > 0 && i === 0) || (dir < 0 && i === 1)) break;
    }
    pts.push(top);
    return pts;
  };
  const sample = (pts, M) => {
    const seg = []; let L = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
    const out = [];
    for (let k = 0; k <= M; k++) {
      let d = (k / M) * L, i = 0;
      while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
      const f = Math.min(1, d / seg[i]);
      out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]);
    }
    return out;
  };
  const LEGS = 0.66;
  a.lineCap = "round"; a.lineJoin = "round"; a.lineWidth = 22;
  for (const dir of [1, -1]) {
    const pts = sample(branch(dir), 90);
    for (let k = pts.length - 1; k > 0; k--) {
      a.strokeStyle = `rgb(${Math.round(LEGS * 255 * (k / (pts.length - 1)))},0,0)`;
      a.beginPath(); a.moveTo(pts[k - 1][0], pts[k - 1][1]); a.lineTo(pts[k][0], pts[k][1]); a.stroke();
    }
  }
  // flame: bottom (y 14) → tip (y 0)
  const fg = a.createLinearGradient(0, 14, 0, 0);
  fg.addColorStop(0, "rgb(179,0,0)"); fg.addColorStop(1, "rgb(214,0,0)");
  a.fillStyle = fg; a.strokeStyle = fg; a.lineWidth = 5;
  a.fill(flame); a.stroke(flame);
  // ingot: from its middle outwards
  const [ix, , iw] = g.ingot;
  const ig = a.createLinearGradient(ix, 0, ix + iw, 0);
  ig.addColorStop(0, "rgb(255,0,0)"); ig.addColorStop(0.5, "rgb(219,0,0)"); ig.addColorStop(1, "rgb(255,0,0)");
  a.fillStyle = ig; a.strokeStyle = ig; a.lineWidth = 4;
  roundRect(a, g.ingot); a.fill(); a.stroke();

  // the mark in its brand colours: the SVG's own gradients (objectBoundingBox) and dark slot
  const solid = cv();
  const c = solid.getContext("2d");
  view(c);
  const grad = (id, x0, y0, x1, y1) => {
    const g2 = c.createLinearGradient(x0, y0, x1, y1);
    const el = document.getElementById(id);
    (el ? [...el.querySelectorAll("stop")] : []).forEach((st) => g2.addColorStop(+st.getAttribute("offset"), st.getAttribute("stop-color")));
    return g2;
  };
  c.fillStyle = grad("g-steel", 0, 17, 0, 95); c.fill(legs);
  c.fillStyle = "#0b0908"; roundRect(c, g.slot); c.fill();
  const [gx, , gw] = g.ingot;
  c.fillStyle = grad("g-ingot", gx, 0, gx + gw, 0); roundRect(c, g.ingot); c.fill();
  c.fillStyle = grad("g-flame", 0, 0, 0, 14); c.fill(flame);

  return { mark: makeTex(gl, mark), arr: makeTex(gl, arr), solid: makeTex(gl, solid) };
}

export class IntroGL {
  /** @param {import("./forge-gl.js").Forge} forge */
  constructor(forge) {
    this.f = forge;
    const { gl } = forge;
    this.prog = forge.makeProgram(VERT, INTRO_FRAG, NAMES);
    this.tex = buildTextures(gl, 512);
    // scene values, written by the director every frame
    this.v = {
      lightK: 0, core: 0, crack: 0, fill: 0, hot: 0, solid: 0, sweep: -1, markOn: 1, rise: 0,
      reveal: -1, flash: 0, strike: [0, 0, 9, 0], light: [0, 0], box: [0, 0, 1, 1],
    };
  }

  ready() { return this.prog.ready(); }

  /**
   * Places the mark: centre (cx, cy) and size S in CSS px relative to the canvas.
   * Returns the CSS position of the light (the apex of the hollow).
   */
  place(cx, cy, S, W, H) {
    const B = S * SPAN / 100;
    const x0 = cx - S / 2 - (PAD / 100) * S, y0 = cy - S / 2 - (PAD / 100) * S;
    this.v.box = [x0 / W, 1 - (y0 + B) / H, B / W, B / H];
    const lx = cx - S / 2 + 0.5 * S, ly = cy - S / 2 + 0.43 * S;
    this.css = { lx, ly, W, H };
    return { lx, ly };
  }

  /** CSS px → canvas px (y up), using the current drawing‑buffer size. */
  toPx(x, y) { const c = this.f.canvas; return [(x / this.css.W) * c.width, (1 - y / this.css.H) * c.height]; }

  draw(gl, s) {
    if (!this.ready()) return;
    const { u } = this.prog, { v } = this, f = this.f, c = f.canvas;
    gl.useProgram(this.prog.pr);
    if (v.reveal > -0.24) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); }
    else gl.disable(gl.BLEND);
    const [lx, ly] = this.toPx(this.css.lx, this.css.ly);
    gl.uniform2f(u.uRes, c.width, c.height);
    gl.uniform1f(u.uTime, s.time);
    gl.uniform2f(u.uLight, lx, ly);
    gl.uniform1f(u.uLightK, v.lightK);
    gl.uniform1f(u.uCore, v.core);
    gl.uniform2f(u.uMouse, f.mx, f.my);
    gl.uniform1f(u.uHeat, f.hasPointer ? f.heat : 0);
    gl.uniform4f(u.uMarkBox, ...v.box);
    gl.uniform1f(u.uCrack, v.crack);
    gl.uniform1f(u.uFill, v.fill);
    gl.uniform1f(u.uHot, v.hot);
    gl.uniform1f(u.uSolid, v.solid);
    gl.uniform1f(u.uSweep, v.sweep);
    gl.uniform1f(u.uMarkOn, v.markOn);
    gl.uniform1f(u.uRise, f.textReady ? v.rise : 0);
    gl.uniform4f(u.uGlyph, ...(f.glyph || [0, 0, 1, 1]));
    gl.uniform2f(u.uTexel, ...(f.texel || [0.001, 0.001]));
    gl.uniform1f(u.uReveal, v.reveal);
    const [sx, sy] = this.toPx(v.strike[0], v.strike[1]);
    gl.uniform4f(u.uStrike, sx, sy, v.strike[2], v.strike[3]);
    gl.uniform1f(u.uFlash, v.flash);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, f.tex); gl.uniform1i(u.uText, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tex.mark); gl.uniform1i(u.uMark, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.tex.arr); gl.uniform1i(u.uArr, 2);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.tex.solid); gl.uniform1i(u.uSolidTex, 3);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE0);
  }

  /** Frees the program and both textures; the context stays with the hero. */
  dispose() {
    const { gl } = this.f;
    this.prog.dispose();
    gl.deleteTexture(this.tex.mark);
    gl.deleteTexture(this.tex.arr);
    gl.deleteTexture(this.tex.solid);
    this.tex = null;
  }
}
