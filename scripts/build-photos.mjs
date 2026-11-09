// Crops + palette-grades the approved Unsplash originals (brand-originals/photos) into src/assets/photos.
// Grade is applied ONCE at build time (static pixels): blacks lifted to Midnight Plum, a soft Velvet-Plum wash, slightly calmer saturation — so
// candle-lit, window-lit and textile photos all sit in the logo's plum/gold world. No CSS filters/blend modes are used at runtime.
// Sources & licences: docs/IMAGE-CREDITS.md. Usage: node scripts/build-photos.mjs
import sharp from 'sharp';
const IN = 'brand-originals/photos/', OUT = 'src/assets/photos/';
// crop = fractions of the source [left, top, width, height] → master size
const JOBS = [
  { name: 'reiki',     src: 'reiki-qP12JMidR9c',    crop: [0.115, 0, 0.75, 1],      out: [1600, 1200] },
  { name: 'eft',       src: 'eft-MK60jE_6zXU',      crop: [0, 0.36, 1, 0.42],       out: [1600, 1200] },
  { name: 'tarot',     src: 'tarot--Vykfrw_D-A',    crop: [0, 0.09, 1, 0.825],      out: [1600, 1200] },
  { name: 'botanical', src: 'botanical-cc9o5b3CPU4', crop: [0, 0.03, 1, 0.9375],    out: [1200, 1500] },
  { name: 'sit',       src: 'sit-bMLxl5Orl5s',      crop: [0, 0.10, 1, 0.3333],     out: [1600, 800] },
];
for (const j of JOBS) {
  const meta = await sharp(`${IN}${j.src}.jpg`).metadata();
  const [fx, fy, fw, fh] = j.crop;
  const region = { left: Math.round(fx * meta.width), top: Math.round(fy * meta.height), width: Math.round(fw * meta.width), height: Math.round(fh * meta.height) };
  const [W, H] = j.out;
  const base = await sharp(`${IN}${j.src}.jpg`).extract(region).resize(W, H, { fit: 'cover' })
    .modulate({ saturation: 0.92, brightness: 0.97 }).linear([0.945, 0.945, 0.945], [14, 5, 10]).toBuffer();
  const wash = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 76, g: 31, b: 49, alpha: 0.34 } } }).png().toBuffer();
  await sharp(base).composite([{ input: wash, blend: 'soft-light' }]).jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}${j.name}.jpg`);
  console.log(`${OUT}${j.name}.jpg  ${W}x${H}`);
}
