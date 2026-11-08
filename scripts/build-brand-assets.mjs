// Generates web-optimised brand assets from /brand-originals into /public/brand.
// Originals are never modified — only resized/re-encoded (no crop, recolour or effects).
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const O = 'brand-originals/';
const P = 'public/brand/';
const webp = { quality: 88, effort: 6, alphaQuality: 100 };

// Primary on-plum logo: Dark Background Alternative (C, transparent).
// Encoded as near-lossless WebP (VP8L container, alpha stored natively): crisper than the earlier lossy+alpha encoding.
// NOTE: the Safari/iPad white-rectangle bug was NOT caused by the encoding (see docs/SAFARI-LOGO.md); it was the
// animated blur/drop-shadow filter. This encoding is kept because it is verified working on device.
// quality 40 (was 60): ~15% smaller, still visually lossless — the build ASSERTS max per-channel error <= 8/255 against the approved
// artwork (measured on the dark backdrop). Lossy WebP was rejected: it bleeds up to ~90/255 around thin gold lines.
const logoWebp = { lossless: true, nearLossless: true, quality: 40, effort: 6 };
const MAX_ERR = 8;
const flat = (buf) => sharp(buf).flatten({ background: '#1f0913' }).raw().toBuffer();
async function emit(src, w, out) {
  const ref = await flat(await sharp(src).resize({ width: w }).png().toBuffer());
  const enc = await sharp(src).resize({ width: w }).webp(logoWebp).toBuffer();
  const dec = await flat(enc);
  let mx = 0; for (let i = 0; i < ref.length; i++) { const d = Math.abs(ref[i] - dec[i]); if (d > mx) mx = d; }
  if (mx > MAX_ERR) throw new Error(`${out}: max channel error ${mx} exceeds ${MAX_ERR}`);
  await sharp(enc).toFile(out);
  console.log(`${out}: ${(enc.length / 1024).toFixed(0)} KB, max error ${mx}`);
}
// 1280 added: phones (92vw x 3 DPR ~ 1080 px) and 2x desktop/iPad (640 css px) previously jumped to the 1536 file.
for (const w of [360, 768, 1024, 1280, 1536]) await emit(O + 'C_dark-alternative-transparent.png', w, `${P}logo-dark-${w}.webp`);
// Lettering layer (pixel-exact split of the approved logo, see scripts/bloom/split-logo.py): fades in beneath the
// blooming flower. Same canvas as the full logo (1536x1024) so it aligns exactly.
await emit('brand-originals/derived/wordmark-layer.png', 1024, `${P}logo-wordmark-1024.webp`);
// Universal fallback (<picture> <img src>): PNG alpha works everywhere, incl. browsers without WebP.
await sharp(O + 'C_dark-alternative-transparent.png').resize({ width: 1024 })
  .png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(`${P}logo-dark-1024.png`);
// Sub-mark (D, textured plum) — temporary until a clean transparent sub-mark is supplied
for (const w of [128, 256, 512]) {
  await sharp(O + 'D_submark-plum-textured.png').resize({ width: w }).webp(webp).toFile(`${P}submark-plum-${w}.webp`);
}
// Icons (from the sub-mark, whole image, resized only)
const sq = (w) => sharp(O + 'D_submark-plum-textured.png').resize({ width: w, height: w });
await sq(180).png().toFile(P + 'apple-touch-icon.png');
await sq(192).png().toFile(P + 'icon-192.png');
await sq(512).png().toFile(P + 'icon-512.png');
const ico = await sq(48).png().toBuffer();
const head = Buffer.alloc(22);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4);
head.writeUInt8(48, 6); head.writeUInt8(48, 7); head.writeUInt16LE(1, 10); head.writeUInt16LE(32, 12);
head.writeUInt32LE(ico.length, 14); head.writeUInt32LE(22, 18);
await writeFile('public/favicon.ico', Buffer.concat([head, ico]));
await sq(32).png().toFile(P + 'favicon-32.png');

// Open Graph card: logo C centred on Velvet Plum (#4C1F31)
const logo = await sharp(O + 'C_dark-alternative-transparent.png').resize({ height: 500 }).png().toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#4C1F31' } })
  .composite([{ input: logo, gravity: 'center' }])
  .jpeg({ quality: 88 }).toFile(P + 'og-image.jpg');
console.log('brand assets built');
