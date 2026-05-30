const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = data.length;
  const typeBuf = Buffer.from(type);
  const out = Buffer.alloc(len + 12);
  out.writeUInt32BE(len, 0);
  typeBuf.copy(out, 4);
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  out.writeUInt32BE(crc, 8 + len);
  return out;
}

/**
 * Generates a production-level PWA icon
 * Design: Modern Indigo Gradient with a stylized white 'T'
 */
function generateProductionIcon(size) {
  const width = size;
  const height = size;
  const raw = Buffer.alloc((width * 3 + 1) * height);

  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0; // Filter type 0
    for (let x = 0; x < width; x++) {
      const i = y * (width * 3 + 1) + 1 + x * 3;
      
      // Calculate Gradient (Indigo #6366F1 to #4F46E5)
      const ratio = (x + y) / (width + height);
      let r = Math.round(99 + (79 - 99) * ratio);
      let g = Math.round(102 + (70 - 102) * ratio);
      let b = Math.round(241 + (229 - 241) * ratio);

      // Draw stylized "T" (Minimalist Travel Flair)
      // Horizontal bar of T
      const isTopBar = y > height * 0.3 && y < height * 0.42 && x > width * 0.25 && x < width * 0.75;
      // Vertical bar of T
      const isVerticalBar = x > width * 0.44 && x < width * 0.56 && y >= height * 0.42 && y < height * 0.75;
      
      if (isTopBar || isVerticalBar) {
        r = 255; g = 255; b = 255;
      }

      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(path.join(dir, 'icon-192x192.png'), generateProductionIcon(192));
fs.writeFileSync(path.join(dir, 'icon-512x512.png'), generateProductionIcon(512));

console.log('✅ Production-level PWA icons generated with modern branding.');
