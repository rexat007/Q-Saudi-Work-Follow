import fs from 'fs';
import zlib from 'zlib';

function createPng(width, height, r, g, b) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);
    // CRC calculation
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // Raw pixel data: for each scanline, 1 filter byte (0) + width * 3 bytes (RGB)
  const lineLength = 1 + width * 3;
  const raw = Buffer.alloc(lineLength * height);

  for (let y = 0; y < height; y++) {
    const offset = y * lineLength;
    raw[offset] = 0; // No filter
    for (let x = 0; x < width; x++) {
      const pxOffset = offset + 1 + x * 3;
      // Slight gradient or border
      const isBorder = x < 4 || x >= width - 4 || y < 4 || y >= height - 4;
      // Center icon symbol (scale / box)
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      const inCenterCircle = dist < width * 0.35 && dist > width * 0.32;
      const inInnerBox = Math.abs(x - cx) < width * 0.2 && Math.abs(y - cy) < height * 0.15;

      if (isBorder || inCenterCircle || inInnerBox) {
        raw[pxOffset] = 255;
        raw[pxOffset + 1] = 255;
        raw[pxOffset + 2] = 255;
      } else {
        raw[pxOffset] = r;
        raw[pxOffset + 1] = g;
        raw[pxOffset + 2] = b;
      }
    }
  }

  const compressed = zlib.deflateSync(raw);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Simple CRC-32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

if (!fs.existsSync('public')) {
  fs.mkdirSync('public', { recursive: true });
}

// Brand Amber: RGB(217, 119, 6)
fs.writeFileSync('public/pwa-192x192.png', createPng(192, 192, 217, 119, 6));
fs.writeFileSync('public/pwa-512x512.png', createPng(512, 512, 217, 119, 6));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPng(512, 512, 180, 83, 9));
fs.writeFileSync('public/apple-touch-icon.png', createPng(180, 180, 217, 119, 6));
fs.writeFileSync('public/favicon.ico', createPng(32, 32, 217, 119, 6));
console.log('Successfully generated compliant PWA PNG and ICO icons in public/');
