// Generates the app icons (teal square with a white dumbbell) without any dependencies.
// Run: node scripts/gen-icons.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const BG = [15, 118, 110]; // #0f766e
const FG = [255, 255, 255];
const SS = 4; // supersampling per axis

function crc32(buf) {
  let c,
    crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Is point (x, y) in [0,1] icon space inside a rounded rectangle? */
function inRoundedRect(x, y, cx, cy, w, h, r) {
  const dx = Math.abs(x - cx) - (w / 2 - r);
  const dy = Math.abs(y - cy) - (h / 2 - r);
  if (dx <= 0 && dy <= 0) return true;
  const ex = Math.max(dx, 0);
  const ey = Math.max(dy, 0);
  return ex * ex + ey * ey <= r * r;
}

// Dumbbell: bar + two inner plates + two outer plates, centred, inside the 80% safe zone.
function inGlyph(x, y) {
  return (
    inRoundedRect(x, y, 0.5, 0.5, 0.64, 0.09, 0.045) ||
    inRoundedRect(x, y, 0.5 - 0.2, 0.5, 0.1, 0.4, 0.03) ||
    inRoundedRect(x, y, 0.5 + 0.2, 0.5, 0.1, 0.4, 0.03) ||
    inRoundedRect(x, y, 0.5 - 0.31, 0.5, 0.08, 0.28, 0.025) ||
    inRoundedRect(x, y, 0.5 + 0.31, 0.5, 0.08, 0.28, 0.025)
  );
}

function png(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let py = 0; py < size; py++) {
    const rowStart = py * (1 + size * 3);
    raw[rowStart] = 0; // filter: none
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          if (inGlyph(x, y)) hits++;
        }
      }
      const a = hits / (SS * SS);
      const o = rowStart + 1 + px * 3;
      for (let c = 0; c < 3; c++) raw[o + c] = Math.round(BG[c] * (1 - a) + FG[c] * a);
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", png(192));
writeFileSync("public/icons/icon-512.png", png(512));
writeFileSync("public/icons/apple-touch-icon.png", png(180));
console.log("icons written to public/icons");
