// Turns Ghada's original photos into fast, correctly sized web images.
// Originals stay untouched in images/; resized copies are cached in .cache/
// so rebuilding is quick. Location data and other metadata are stripped.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const PHOTO_WIDTHS = [480, 800, 1200, 1600, 2000];
const FALLBACK_WIDTH = 1200;
const IVORY = '#F8F4EE';

function slugify(name) {
  return name.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'image';
}

export function createImagePipeline({ root, outDir, base, cacheDir }) {
  const memo = new Map();
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.mkdirSync(path.join(outDir, 'img'), { recursive: true });

  const sourceInfo = (src) => {
    const file = path.join(root, src);
    const buffer = fs.readFileSync(file);
    const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 10);
    return { file, buffer, hash, stem: `${slugify(path.basename(src))}-${hash}` };
  };

  /** Writes one variant via the cache and returns its public URL. */
  async function variant(name, produce) {
    const cached = path.join(cacheDir, name);
    if (!fs.existsSync(cached)) {
      const data = await produce();
      fs.writeFileSync(cached, data);
    }
    fs.copyFileSync(cached, path.join(outDir, 'img', name));
    return `${base}/img/${name}`;
  }

  function once(key, fn) {
    if (!memo.has(key)) memo.set(key, fn());
    return memo.get(key);
  }

  /** A photograph in several widths (WebP) plus a JPEG fallback. */
  function photo(src) {
    return once(`photo:${src}`, async () => {
      const { buffer, stem } = sourceInfo(src);
      const meta = await sharp(buffer).rotate().metadata();
      // .rotate() honours the camera orientation; swap sides when needed.
      const rotated = (meta.orientation ?? 1) >= 5;
      const width = rotated ? meta.height : meta.width;
      const height = rotated ? meta.width : meta.height;
      const widths = PHOTO_WIDTHS.filter((w) => w < width);
      if (widths.length === 0 || width <= PHOTO_WIDTHS.at(-1)) widths.push(Math.min(width, PHOTO_WIDTHS.at(-1)));
      const unique = [...new Set(widths)].sort((a, b) => a - b);

      const webp = [];
      for (const w of unique) {
        const url = await variant(`${stem}-${w}.webp`, () =>
          sharp(buffer).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer(),
        );
        webp.push({ url, width: w });
      }
      const fallbackWidth = Math.min(FALLBACK_WIDTH, width);
      const fallback = await variant(`${stem}-${fallbackWidth}.jpg`, () =>
        sharp(buffer)
          .rotate()
          .resize({ width: fallbackWidth, withoutEnlargement: true })
          .flatten({ background: IVORY })
          .jpeg({ quality: 80, mozjpeg: true })
          .toBuffer(),
      );
      return { width, height, webp, fallback };
    });
  }

  /**
   * A logo for the header: SVG copied as-is; a raster logo scaled down in
   * proportion (sharp enough for 3× screens) with its transparency kept.
   */
  function logo(src) {
    return once(`logo:${src}`, async () => {
      const { buffer, stem } = sourceInfo(src);
      const meta = await sharp(buffer).metadata();
      if (path.extname(src).toLowerCase() === '.svg') {
        const url = await variant(`${stem}.svg`, async () => buffer);
        return { url, width: meta.width, height: meta.height, svg: true };
      }
      const height = Math.min(meta.height, 192);
      const width = Math.round((meta.width / meta.height) * height);
      const url = await variant(`${stem}-${height}.webp`, () => sharp(buffer).resize({ height }).webp({ quality: 90, alphaQuality: 100 }).toBuffer());
      return { url, width, height, svg: false };
    });
  }

  /** Favicons from the square monogram. */
  function icon(src) {
    return once(`icon:${src}`, async () => {
      const { buffer, stem } = sourceInfo(src);
      const square = (size) => () =>
        sharp(buffer, { density: 300 }).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      return {
        favicon: await variant(`${stem}-32.png`, square(32)),
        apple: await variant(`${stem}-180.png`, () =>
          sharp(buffer, { density: 300 }).resize(180, 180, { fit: 'contain', background: IVORY }).flatten({ background: IVORY }).png().toBuffer(),
        ),
        large: await variant(`${stem}-512.png`, square(512)),
        svg: path.extname(src).toLowerCase() === '.svg' ? await variant(`${stem}.svg`, async () => buffer) : null,
      };
    });
  }

  /** A 1200 × 630 crop for link previews on WhatsApp, Instagram and Facebook. */
  function share(src) {
    return once(`share:${src}`, async () => {
      const { buffer, stem } = sourceInfo(src);
      const url = await variant(`${stem}-share.jpg`, () =>
        sharp(buffer)
          .rotate()
          .resize(1200, 630, { fit: 'cover', position: sharp.strategy.attention })
          .flatten({ background: IVORY })
          .jpeg({ quality: 82, mozjpeg: true })
          .toBuffer(),
      );
      return { url, width: 1200, height: 630 };
    });
  }

  return { photo, logo, icon, share };
}
