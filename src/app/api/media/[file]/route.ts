import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import type { NextRequest } from "next/server";

/** Streams locally stored videos (used when Supabase Storage isn't configured). Supports Range for seeking. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/media/[file]">) {
  const { file } = await ctx.params;
  if (!/^[\w-]+\.mp4$/.test(file)) return new Response("bad name", { status: 400 });
  const p = path.join(process.cwd(), ".data", "videos", file);
  if (!fs.existsSync(p)) return new Response("not found", { status: 404 });
  const size = fs.statSync(p).size;
  const range = req.headers.get("range");
  const stream = (start: number, end: number) =>
    Readable.toWeb(fs.createReadStream(p, { start, end })) as ReadableStream;
  if (range) {
    const m = range.match(/bytes=(\d*)-(\d*)/);
    const start = m?.[1] ? Number(m[1]) : 0;
    const end = m?.[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    return new Response(stream(start, end), {
      status: 206,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
      },
    });
  }
  return new Response(stream(0, size - 1), {
    headers: { "Content-Type": "video/mp4", "Content-Length": String(size), "Accept-Ranges": "bytes" },
  });
}
