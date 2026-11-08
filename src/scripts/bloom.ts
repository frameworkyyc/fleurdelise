/**
 * Cinematic hero bloom player (progressive enhancement; the static approved logo is ALWAYS the fallback).
 *
 * A stacked-alpha video (top half = premultiplied colour, bottom half = alpha matte) is decoded by an ordinary
 * <video> and composited on a WebGL canvas, so the AI-generated lotus bloom floats over the hero's real
 * background with no visible rectangle. Safari/iOS plays the H.264 MP4; other browsers the VP9 WebM.
 *
 * Sequence (all times are seconds into the video; the clip's last frames are baked to equal the approved emblem):
 *   0.0  bud swells and opens → crescent, moons, star, leaves emerge
 *   GO   hero text is released
 *   WORD the approved lettering fades in beneath the flower (exact original pixels)
 *   end  the exact static logo cross-fades in over identical pixels; canvas + lettering layer fade out and are removed
 *
 * Plays once per tab session (sessionStorage), never on scroll. Skipped for reduced motion, data-saver, 3G-or-slower, low-core/low-memory devices,
 * no WebGL, hidden tabs, slow starts (> START_TIMEOUT), autoplay refusal (e.g. iOS Low Power Mode) or any error.
 * Deliberately uses no CSS filters or blend modes (docs/SAFARI-LOGO.md).
 */
export {};

const GO = 1.3;           // hero text cue
const WORD = 1.8;         // lettering fade-in cue (the flower is essentially complete; crescent + leaves are finishing)
const START_TIMEOUT = 1200; // ms to get the first playable frame before falling back to the static logo
const BASE = '/brand/bloom/';
const SEEN_KEY = 'fdl-bloom-seen';

const root = document.documentElement;
const frame = document.querySelector<HTMLElement>('[data-bloom-frame]');
const stage = frame?.querySelector<HTMLElement>('.bloom-stage') ?? null;
const canvas = stage?.querySelector<HTMLCanvasElement>('.bloom-canvas') ?? null;
const video = stage?.querySelector<HTMLVideoElement>('.bloom-video') ?? null;

let finished = false;
let gl: WebGLRenderingContext | null = null;
let watchdog = 0;

function dispose() {
  try { video?.pause(); video?.removeAttribute('src'); video?.load(); } catch { /* ignore */ }
  try { gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* ignore */ }
  stage?.remove();
  frame?.querySelector('.bloom-word')?.remove();
  // NOTE: keep html.bloom-done — removing it would re-trigger the static logo's entrance animation after the hand-off.
  root.classList.remove('bloom-word-in');
}

/** Hand control back to the exact static logo. `animated` = the bloom actually played to the end. */
function finish(animated: boolean) {
  if (finished) return;
  finished = true;
  clearTimeout(watchdog);
  root.classList.add('hero-go');
  if (animated) root.classList.add('bloom-done'); // static logo fades in over identical pixels
  root.classList.remove('bloom-pending');          // (if cancelled, the static logo's own CSS fade-in runs)
  setTimeout(dispose, animated ? 900 : 50);
}

function initGL(w: number, h: number) {
  const ctx = canvas!.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!ctx) throw new Error('no webgl');
  const sh = (type: number, src: string) => { const s = ctx.createShader(type)!; ctx.shaderSource(s, src); ctx.compileShader(s); if (!ctx.getShaderParameter(s, ctx.COMPILE_STATUS)) throw new Error('shader'); return s; };
  const prog = ctx.createProgram()!;
  ctx.attachShader(prog, sh(ctx.VERTEX_SHADER, 'attribute vec2 p; varying vec2 uv; void main(){ uv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }'));
  // top half of the video = premultiplied colour, bottom half = alpha matte (greyscale). Half-texel inset avoids bleed between halves.
  ctx.attachShader(prog, sh(ctx.FRAGMENT_SHADER, `precision mediump float; varying vec2 uv; uniform sampler2D t; uniform vec2 sz;
    void main(){ float x = (uv.x * (sz.x - 1.) + .5) / sz.x;
      vec3 c = texture2D(t, vec2(x, (uv.y * (sz.y - 1.) + .5) / (2. * sz.y))).rgb;
      float a = texture2D(t, vec2(x, (sz.y + uv.y * (sz.y - 1.) + .5) / (2. * sz.y))).r;
      gl_FragColor = vec4(min(c, vec3(a)), a); }`));
  ctx.linkProgram(prog);
  if (!ctx.getProgramParameter(prog, ctx.LINK_STATUS)) throw new Error('link');
  ctx.useProgram(prog);
  const buf = ctx.createBuffer(); ctx.bindBuffer(ctx.ARRAY_BUFFER, buf);
  ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), ctx.STATIC_DRAW);
  const loc = ctx.getAttribLocation(prog, 'p'); ctx.enableVertexAttribArray(loc); ctx.vertexAttribPointer(loc, 2, ctx.FLOAT, false, 0, 0);
  const tex = ctx.createTexture(); ctx.bindTexture(ctx.TEXTURE_2D, tex);
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE); ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR); ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
  ctx.uniform2f(ctx.getUniformLocation(prog, 'sz'), w, h);
  ctx.clearColor(0, 0, 0, 0);
  return ctx;
}

function fit() {
  if (!gl || !canvas || !stage) return;
  const r = stage.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.max(2, Math.round(r.width * dpr));
  canvas.height = Math.max(2, Math.round(r.height * dpr));
  gl.viewport(0, 0, canvas.width, canvas.height);
}

function draw() {
  if (!gl || !video || video.readyState < 2) return;
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

async function run() {
  const v = video!;
  const apple = /Apple/i.test(navigator.vendor || '');
  const webm = !apple && !!v.canPlayType('video/webm; codecs="vp9"');
  v.muted = true; v.playsInline = true; v.preload = 'auto';

  // get the first playable frame (or give up quickly and show the static logo)
  const playable = new Promise<void>((res, rej) => {
    v.addEventListener('canplay', () => res(), { once: true });
    v.addEventListener('error', () => rej(new Error('video error')), { once: true });
  });
  v.src = BASE + (webm ? 'bloom.webm' : 'bloom.mp4');
  v.load();
  await Promise.race([playable, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('start timeout')), START_TIMEOUT))]);
  if (document.hidden) throw new Error('hidden');

  // stacked video: width × 2·height → the canvas matches the 16:9 colour half
  gl = initGL(v.videoWidth, v.videoHeight / 2);
  fit();
  addEventListener('resize', fit);
  canvas!.addEventListener('webglcontextlost', (e) => { e.preventDefault(); finish(false); });

  let goDone = false, wordDone = false, last = 0, slow = 0, frames = 0;
  const tick = () => {
    if (finished) return;
    draw();
    // frame-rate guard: only for genuinely poor playback (< 10 fps for half of the first frames) — hand over to the static logo
    const now = performance.now();
    if (last) { frames++; if (now - last > 100) slow++; }
    last = now;
    if (frames === 16 && slow >= 8) { finish(true); return; }
    const t = v.currentTime;
    if (!goDone && t >= GO) { goDone = true; root.classList.add('hero-go'); }
    if (!wordDone && t >= WORD) { wordDone = true; root.classList.add('bloom-word-in'); }
    schedule();
  };
  const schedule = () => { if ('requestVideoFrameCallback' in v) (v as any).requestVideoFrameCallback(tick); else requestAnimationFrame(tick); };

  v.addEventListener('ended', () => { draw(); finish(true); }, { once: true });
  v.addEventListener('error', () => finish(false));
  await v.play();                                    // rejects if autoplay is refused → static logo
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode etc. */ }
  root.dataset.bloom = 'playing';
  draw();
  schedule();
  // watchdog: never leave the static logo hidden if playback stalls
  watchdog = window.setTimeout(() => finish(v.currentTime > 0.5), (v.duration || 4) * 1000 + 4000);
}

if (frame && stage && canvas && video && root.classList.contains('bloom-pending')) {
  addEventListener('pageshow', (e) => { if ((e as PageTransitionEvent).persisted) finish(false); }); // bfcache restore: show the static logo, don't replay
  run().catch(() => finish(false));
}
