import zlib from "node:zlib";

/**
 * Background removal returns the product on its original, mostly transparent canvas.
 * trimPng crops to the opaque pixels (so compositing sizes the product, not the canvas)
 * and box-downscales to maxSide. Handles 8-bit RGBA, non-interlaced PNGs, which is
 * what bg removers emit; anything else is returned untouched.
 */
export function trimPng(png: Buffer, maxSide = 1200): { png: Buffer; aspect: number } {
  const w = png.readUInt32BE(16);
  const h = png.readUInt32BE(20);
  const [depth, colorType, , , interlace] = png.subarray(24, 29);
  if (png.toString("ascii", 1, 4) !== "PNG" || depth !== 8 || colorType !== 6 || interlace !== 0) {
    return { png, aspect: w / h };
  }

  const idat: Buffer[] = [];
  for (let off = 8; off < png.length; ) {
    const len = png.readUInt32BE(off);
    if (png.toString("ascii", off + 4, off + 8) === "IDAT") idat.push(png.subarray(off + 8, off + 8 + len));
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const px = unfilter(raw, w, h);

  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { png, aspect: w / h }; // fully transparent: nothing to trim

  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const k = Math.max(1, Math.ceil(Math.max(cw, ch) / maxSide)); // box filter factor
  const ow = Math.floor(cw / k) || 1, oh = Math.floor(ch / k) || 1;
  const out = Buffer.alloc(oh * (ow * 4 + 1)); // filter byte 0 (None) per row
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const sum = [0, 0, 0, 0];
      for (let dy = 0; dy < k; dy++) {
        for (let dx = 0; dx < k; dx++) {
          const i = ((y0 + y * k + dy) * w + (x0 + x * k + dx)) * 4;
          for (let c = 0; c < 4; c++) sum[c] += px[i + c];
        }
      }
      const o = y * (ow * 4 + 1) + 1 + x * 4;
      for (let c = 0; c < 4; c++) out[o + c] = Math.round(sum[c] / (k * k));
    }
  }
  return { png: encode(out, ow, oh), aspect: +(cw / ch).toFixed(3) };
}

/** Undo PNG row filters (None, Sub, Up, Average, Paeth) for 4 bytes per pixel. */
function unfilter(raw: Buffer, w: number, h: number): Buffer {
  const stride = w * 4;
  const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const type = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const row = y * stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= 4 ? px[row + i - 4] : 0;
      const b = y > 0 ? px[row - stride + i] : 0;
      const c = i >= 4 && y > 0 ? px[row - stride + i - 4] : 0;
      const p = a + b - c;
      const pr = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c;
      const pred = type === 1 ? a : type === 2 ? b : type === 3 ? (a + b) >> 1 : type === 4 ? pr : 0;
      px[row + i] = (raw[src + i] + pred) & 0xff;
    }
  }
  return px;
}

function encode(rows: Buffer, w: number, h: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
