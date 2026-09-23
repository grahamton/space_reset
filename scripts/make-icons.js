/**
 * Draws the app icons (the indigo Zap mark from index.html's favicon) as PNGs
 * into public/icons/. No image dependencies: a tiny rasterizer plus Node's zlib.
 *
 *   node scripts/make-icons.js
 *
 * Re-run only if the mark changes; the PNGs are committed.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const OUT = path.join(
  path.dirname(path.dirname(fileURLToPath(import.meta.url))),
  'public',
  'icons'
);

const INDIGO = [0x4f, 0x46, 0xe5];
const WHITE = [0xff, 0xff, 0xff];
// The favicon's bolt, 'M13 2 5 14h6l-1 8 8-12h-6z', in its 24x24 viewBox.
const BOLT = [
  [13, 2],
  [5, 14],
  [11, 14],
  [10, 22],
  [18, 10],
  [12, 10]
];
const SAMPLES = 4; // 4x4 supersampling for smooth edges

const insidePolygon = (x, y, points) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

const insideRoundedRect = (x, y, size, radius) => {
  const cx = Math.min(Math.max(x, radius), size - radius);
  const cy = Math.min(Math.max(y, radius), size - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
};

/**
 * @param {number} size - output pixels
 * @param {{maskable: boolean}} opts - maskable icons are full-bleed with the
 *   mark inside the central 80% safe zone, since Android crops them to a shape.
 */
const drawIcon = (size, { maskable }) => {
  const rgba = Buffer.alloc(size * size * 4);
  // Bolt spans 24 units; maskable shrinks it so it stays in the safe zone.
  const boltScale = (maskable ? 0.62 : 0.8) * (size / 24);
  const boltOffset = (size - 24 * boltScale) / 2;
  const radius = (5 / 24) * size;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let bg = 0;
      let bolt = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = px + (sx + 0.5) / SAMPLES;
          const y = py + (sy + 0.5) / SAMPLES;
          if (maskable || insideRoundedRect(x, y, size, radius)) bg++;
          if (insidePolygon((x - boltOffset) / boltScale, (y - boltOffset) / boltScale, BOLT))
            bolt++;
        }
      }
      const n = SAMPLES * SAMPLES;
      const boltShare = bolt / n;
      const i = (py * size + px) * 4;
      for (let c = 0; c < 3; c++) {
        rgba[i + c] = Math.round(INDIGO[c] * (1 - boltShare) + WHITE[c] * boltShare);
      }
      rgba[i + 3] = Math.round((Math.max(bg, bolt) / n) * 255);
    }
  }
  return encodePng(size, size, rgba);
};

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const encodePng = (width, height, rgba) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA, no interlace
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
};

mkdirSync(OUT, { recursive: true });
const icons = {
  'icon-192.png': drawIcon(192, { maskable: false }),
  'icon-512.png': drawIcon(512, { maskable: false }),
  'maskable-512.png': drawIcon(512, { maskable: true }),
  // iOS home screen; it applies its own rounding, so full-bleed.
  'apple-touch-icon.png': drawIcon(180, { maskable: true })
};
for (const [name, png] of Object.entries(icons)) {
  writeFileSync(path.join(OUT, name), png);
  console.log(`${name}: ${Math.round(png.length / 1024)} KB`);
}
