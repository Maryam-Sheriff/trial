// Self-hosted fonts plus the stylesheet and script, with content hashes in
// their file names so browsers can cache them for a long time.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const ARABIC =
  'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC';

// Arabic fonts only carry Arabic glyphs here, so Latin words on Arabic pages
// (like "GK Atelier") keep the English typefaces.
const FONTS = [
  { family: 'Cormorant Garamond', pkg: 'cormorant-garamond', subset: 'latin', range: LATIN, weight: 400, style: 'normal' },
  { family: 'Cormorant Garamond', pkg: 'cormorant-garamond', subset: 'latin', range: LATIN, weight: 500, style: 'normal', preload: 'en' },
  { family: 'Cormorant Garamond', pkg: 'cormorant-garamond', subset: 'latin', range: LATIN, weight: 600, style: 'normal' },
  { family: 'Cormorant Garamond', pkg: 'cormorant-garamond', subset: 'latin', range: LATIN, weight: 400, style: 'italic' },
  { family: 'Jost', pkg: 'jost', subset: 'latin', range: LATIN, weight: 400, style: 'normal', preload: 'en' },
  { family: 'Jost', pkg: 'jost', subset: 'latin', range: LATIN, weight: 500, style: 'normal' },
  { family: 'Amiri', pkg: 'amiri', subset: 'arabic', range: ARABIC, weight: 400, style: 'normal', preload: 'ar' },
  { family: 'Amiri', pkg: 'amiri', subset: 'arabic', range: ARABIC, weight: 700, style: 'normal' },
  { family: 'IBM Plex Sans Arabic', pkg: 'ibm-plex-sans-arabic', subset: 'arabic', range: ARABIC, weight: 400, style: 'normal', preload: 'ar' },
  { family: 'IBM Plex Sans Arabic', pkg: 'ibm-plex-sans-arabic', subset: 'arabic', range: ARABIC, weight: 500, style: 'normal' },
  { family: 'IBM Plex Sans Arabic', pkg: 'ibm-plex-sans-arabic', subset: 'arabic', range: ARABIC, weight: 600, style: 'normal' },
];

const hash = (data) => crypto.createHash('sha1').update(data).digest('hex').slice(0, 10);

function writeHashed(outDir, base, name, ext, data) {
  const file = `${name}.${hash(data)}.${ext}`;
  fs.writeFileSync(path.join(outDir, 'assets', file), data);
  return `${base}/assets/${file}`;
}

export function buildAssets({ srcDir, outDir, base }) {
  fs.mkdirSync(path.join(outDir, 'assets/fonts'), { recursive: true });
  const faces = [];
  const fontPreloads = { en: [], ar: [] };

  for (const font of FONTS) {
    const fileName = `${font.pkg}-${font.subset}-${font.weight}-${font.style}.woff2`;
    const source = require.resolve(`@fontsource/${font.pkg}/files/${fileName}`);
    const data = fs.readFileSync(source);
    const url = `${base}/assets/fonts/${fileName.replace('.woff2', `.${hash(data)}.woff2`)}`;
    fs.writeFileSync(path.join(outDir, url.slice(base.length + 1)), data);
    faces.push(`@font-face{font-family:'${font.family}';font-style:${font.style};font-weight:${font.weight};font-display:swap;src:url(${url}) format('woff2');unicode-range:${font.range}}`);
    if (font.preload) fontPreloads[font.preload].push(url);
  }

  // Light minification: drop comments and collapse whitespace.
  const css = fs
    .readFileSync(path.join(srcDir, 'assets/css/site.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,>])\s*/g, '$1')
    .trim();
  const js = fs.readFileSync(path.join(srcDir, 'assets/js/site.js'), 'utf8');

  return {
    css: writeHashed(outDir, base, 'site', 'css', `${faces.join('\n')}\n${css}`),
    js: writeHashed(outDir, base, 'site', 'js', js),
    fontPreloads,
  };
}
