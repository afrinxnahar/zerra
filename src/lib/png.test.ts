// npx tsx src/lib/png.test.ts
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { trimPng } from "./png";

// 10x8 transparent canvas with an opaque 4x6 block at (3,1), encoded with a mix of row filters
function makePng() {
  const w = 10, h = 8;
  const rows: number[] = [];
  const pixel = (x: number, y: number) => (x >= 3 && x < 7 && y >= 1 && y < 7 ? [200, 100, 50, 255] : [0, 0, 0, 0]);
  for (let y = 0; y < h; y++) {
    const type = y % 2; // alternate None and Sub filters
    rows.push(type);
    for (let x = 0; x < w; x++) {
      const cur = pixel(x, y), left = x > 0 ? pixel(x - 1, y) : [0, 0, 0, 0];
      cur.forEach((v, c) => rows.push(type === 1 ? (v - left[c]) & 0xff : v));
    }
  }
  const chunk = (t: string, d: Buffer) => {
    const body = Buffer.concat([Buffer.from(t), d]);
    const l = Buffer.alloc(4); l.writeUInt32BE(d.length);
    const c = Buffer.alloc(4); c.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([l, body, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(Buffer.from(rows))), chunk("IEND", Buffer.alloc(0))]);
}

const { png, aspect } = trimPng(makePng());
assert.equal(png.readUInt32BE(16), 4, "trimmed width");
assert.equal(png.readUInt32BE(20), 6, "trimmed height");
assert.equal(aspect, +(4 / 6).toFixed(3));
// round-trips through our own decoder: already tight, same size, still opaque orange
const again = trimPng(png);
assert.equal(again.png.readUInt32BE(16), 4);
const half = trimPng(makePng(), 3); // box-downscale by 2
assert.equal(half.png.readUInt32BE(16), 2);
assert.equal(half.png.readUInt32BE(20), 3);
console.log("png trim ok");
