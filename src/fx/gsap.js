/**
 * GSAP + ScrollTrigger, set up for one loop: gsap.ticker is the page's only requestAnimationFrame
 * (ticker.js subscribes to it). ScrollTrigger updates inside the scroll event (no normalizeScroll),
 * so it adds no loop of its own.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// ScrollTrigger keeps an empty rAF loop alive as a Firefox repaint workaround; gsap.ticker already
// requests a frame every frame, so that second loop is dropped while the plugin registers.
const raf = window.requestAnimationFrame;
window.requestAnimationFrame = () => 0;
try { gsap.registerPlugin(ScrollTrigger); } finally { window.requestAnimationFrame = raf; }

// the mobile address bar sliding in and out must not re-measure every trigger
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger };
