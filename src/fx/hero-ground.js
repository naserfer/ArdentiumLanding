/**
 * HERO GROUND — the ground behind the h1, drawn on the hero's WebGL canvas.
 * Mostly black, with the contained glow of a forge mouth just below the frame (bent by hot air),
 * a faint warm pool under the cursor and the ring of a hammer strike. On touch it holds still
 * (uBgT is frozen by the forge). The h1 itself is real text (CSS: the incandescent edge on
 * "vanguardia").
 */
import { GLSL_COMMON } from "./forge-gl.js";

export const HERO_FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uBgT;
uniform vec2 uMouse;
uniform float uHeat;
uniform vec4 uStrike;
uniform float uScroll;
varying vec2 vUv;
${GLSL_COMMON}

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
  float h = forgeHeat(vUv, uRes.x / uRes.y, uBgT) + strikeHeat(p) + uHeat * .05 * exp(-md * md * 6.);
  vec3 col = ramp(h * (1. - uScroll * .55));
  float vig = smoothstep(1.5, .25, length(p * vec2(.7, 1.)));
  col *= mix(.6, 1., vig);
  col += (hash(frag + fract(uBgT) * 91.7) - .5) * .014;
  gl_FragColor = vec4(col, 1.);
}
`;
