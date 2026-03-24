// Uzantı için basit PNG ikonları oluşturur (Node.js built-in, ek paket gerekmez)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size) {
  // Koyu mavi arka plan üzerine beyaz daire
  const R = 30, G = 80, B = 255; // mavi renk

  // Her piksel için RGBA
  const pixels = [];
  const cx = size / 2, cy = size / 2, radius = size * 0.38;

  for (let y = 0; y < size; y++) {
    pixels.push(0); // filter byte (None)
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= radius) {
        // Beyaz daire (iç)
        pixels.push(255, 255, 255, 255);
      } else {
        // Mavi arka plan
        pixels.push(R, G, B, 255);
      }
    }
  }

  const raw = Buffer.from(pixels);
  const compressed = zlib.deflateSync(raw);

  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crcBuf = Buffer.alloc(4);
    let crc = 0xffffffff;
    const crcData = Buffer.concat([typeBuf, data]);
    for (const b of crcData) {
      crc ^= b;
      for (let i = 0; i < 8; i++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // RGBA
  ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;

  const ihdr = chunk('IHDR', ihdrData);
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const iconsDir = path.join(__dirname, '..', 'extension', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const buf = createPNG(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buf);
  console.log(`icon${size}.png oluşturuldu`);
}

console.log('\nTüm ikonlar hazır!');
