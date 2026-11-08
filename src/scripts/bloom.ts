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
const HOLD_MS = 467;        // the clip ends when the dissolve to the exact approved frame completes (3.37 s); this still hold restores the
                            // original 3.83 s hand-off time without decoding/uploading any static frames
const Q = new URLSearchParams(location.search).get('bloom-debug'); // ?bloom-debug  → HUD + stats (forces the bloom); ?bloom-debug=nogl → decode only
const BASE = '/brand/bloom/';
const LITE = new URLSearchParams(location.search).get('bloom-q') === 'lite'; // ?bloom-q=lite → 720 px variant (≈ 40% cheaper to upload) for on-device A/B
const SEEN_KEY = 'fdl-bloom-seen';

const root = document.documentElement;
const frame = document.querySelector<HTMLElement>('[data-bloom-frame]');
const stage = frame?.querySelector<HTMLElement>('.bloom-stage') ?? null;
const canvas = stage?.querySelector<HTMLCanvasElement>('.bloom-canvas') ?? null;
const video = stage?.querySelector<HTMLVideoElement>('.bloom-video') ?? null;

const DEBUG = Q !== null;
const NOGL = Q === 'nogl';
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
  ctx.disable(ctx.DITHER); ctx.disable(ctx.BLEND); ctx.disable(ctx.DEPTH_TEST); // the quad overwrites every pixel (premultiplied output): no clear / blend needed
  // allocate the texture ONCE; per-frame uploads then use texSubImage2D (no GPU re-allocation every frame)
  ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, w, h * 2, 0, ctx.RGBA, ctx.UNSIGNED_BYTE, null);
  return ctx;
}

function fit() {
  if (!gl || !canvas || !stage) return;
  const r = stage.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  // never render more pixels than the video actually contains (the compositor scales the canvas up for free)
  const w = Math.max(2, Math.min(Math.round(r.width * dpr), video?.videoWidth || 1e5));
  canvas.width = w;
  canvas.height = Math.max(2, Math.round(w * (r.height / r.width)));
  gl.viewport(0, 0, canvas.width, canvas.height);
}

let uploadMs: number[] = [];
function draw() {
  if (!gl || !video || video.readyState < 2) return;
  const t0 = DEBUG ? performance.now() : 0;
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, video);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  if (DEBUG) uploadMs.push(performance.now() - t0);
}

/* ---------- debug: capture real-device playback numbers (?bloom-debug / ?bloom-debug=nogl) ---------- */
const rafIv: number[] = [];
let rafRun = false;
function startRaf() { rafRun = true; let last = 0; const f = (t: number) => { if (!rafRun) return; if (last) rafIv.push(t - last); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f); }
const pc = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
function report(meta: { mt: number; pf: number; pd: number | null; ts: number }[]) {
  rafRun = false;
  const iv = meta.slice(1).map((m, i) => m.ts - meta[i].ts);
  const gaps = meta.slice(1).map((m, i) => m.mt - meta[i].mt);
  const nominal = pc(gaps, 0.5) || 1 / 30;
  let q: { total: number; dropped: number } | null = null;
  try { const x = video!.getVideoPlaybackQuality(); q = { total: x.totalVideoFrames, dropped: x.droppedVideoFrames }; } catch { /* ignore */ }
  const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
  const out = {
    mode: NOGL ? 'decode-only (no GL)' : 'GL composite', video: `${video!.videoWidth}x${video!.videoHeight}`, canvas: canvas ? `${canvas.width}x${canvas.height}` : '-', dpr: devicePixelRatio,
    fps: +(1 / nominal).toFixed(1), frames: meta.length, cbMeanMs: +mean(iv).toFixed(1), cbP95Ms: +pc(iv, 0.95).toFixed(1), cbMaxMs: +Math.max(0, ...iv).toFixed(0),
    skippedFrames: gaps.filter((g) => g > nominal * 1.5).length, uaDropped: q ? `${q.dropped}/${q.total}` : 'n/a',
    uploadMeanMs: +mean(uploadMs).toFixed(2), uploadP95Ms: +pc(uploadMs, 0.95).toFixed(2),
    displayMeanMs: +mean(rafIv).toFixed(1), displayP95Ms: +pc(rafIv, 0.95).toFixed(1), displayOver25ms: `${rafIv.filter((x) => x > 25).length}/${rafIv.length}`,
    gpu: dbg && gl ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'n/a', cores: navigator.hardwareConcurrency, ua: navigator.userAgent,
  };
  (window as any).__bloomStats = out;
  console.log('[bloom-debug]', JSON.stringify(out));
  const pre = document.createElement('pre');
  pre.id = 'bloom-hud';
  pre.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;margin:0;padding:10px 12px;max-width:94vw;background:rgba(0,0,0,.82);color:#fff;font:11px/1.45 ui-monospace,Menlo,monospace;white-space:pre-wrap;user-select:all;border-radius:6px';
  pre.textContent = 'BLOOM PLAYBACK — screenshot or copy this\n' + Object.entries(out).map(([k, v]) => `${k}: ${v}`).join('\n');
  document.body.appendChild(pre);
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
  v.src = BASE + (LITE ? 'lite/' : '') + (webm ? 'bloom.webm' : 'bloom.mp4');
  v.load();
  await Promise.race([playable, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('start timeout')), START_TIMEOUT))]);
  if (document.hidden) throw new Error('hidden');

  // stacked video: width × 2·height → the canvas matches the colour half
  if (!NOGL) {
    gl = initGL(v.videoWidth, v.videoHeight / 2);
    fit();
    addEventListener('resize', fit);
    canvas!.addEventListener('webglcontextlost', (e) => { e.preventDefault(); finish(false); });
  }

  let goDone = false, wordDone = false, last = 0, slow = 0, frames = 0, lastT = -1;
  const meta: { mt: number; pf: number; pd: number | null; ts: number }[] = [];
  const tick = (_now?: number, m?: any) => {
    if (finished) return;
    if (m && DEBUG) meta.push({ mt: m.mediaTime, pf: m.presentedFrames, pd: m.processingDuration ?? null, ts: performance.now() });
    // only touch the GPU when a new video frame is actually available
    if (!NOGL && (m || v.currentTime !== lastT)) draw();
    lastT = v.currentTime;
    // smoothness guard: a device that can only manage a choppy ~<15 fps (callback gaps > 66 ms for half of the first 24 frames)
    // gets the static logo rather than a laggy bloom (hand-off cross-fades from whatever is on screen)
    const now = performance.now();
    if (last) { frames++; if (now - last > 66) slow++; }
    last = now;
    if (frames === 24 && slow >= 12) { finish(true); return; }
    const t = m?.mediaTime ?? v.currentTime;
    if (!goDone && t >= GO) { goDone = true; root.classList.add('hero-go'); }
    if (!wordDone && t >= WORD) { wordDone = true; root.classList.add('bloom-word-in'); }
    schedule();
  };
  const schedule = () => { if ('requestVideoFrameCallback' in v) (v as any).requestVideoFrameCallback(tick); else requestAnimationFrame(tick); };

  v.addEventListener('ended', () => {
    if (!NOGL) draw();
    if (DEBUG) report(meta);
    setTimeout(() => finish(true), HOLD_MS);        // still hold on the exact emblem, then hand off
  }, { once: true });
  v.addEventListener('error', () => finish(false));
  await v.play();                                    // rejects if autoplay is refused → static logo
  if (!DEBUG) { try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode etc. */ } }
  root.dataset.bloom = 'playing';
  if (DEBUG) startRaf();
  if (!NOGL) draw();
  schedule();
  // watchdog: never leave the static logo hidden if playback stalls
  watchdog = window.setTimeout(() => finish(v.currentTime > 0.5), (v.duration || 4) * 1000 + HOLD_MS + 4000);
}

if (frame && stage && canvas && video && root.classList.contains('bloom-pending')) {
  addEventListener('pageshow', (e) => { if ((e as PageTransitionEvent).persisted) finish(false); }); // bfcache restore: show the static logo, don't replay
  run().catch(() => finish(false));
}
