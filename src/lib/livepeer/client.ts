import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { env } from "../env";

/**
 * Thin wrapper around the hosted Livepeer Agent MCP server.
 * Everything the pipeline generates goes through runCapability().
 */

type ToolResult = {
  content?: { type: string; text?: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

export type CapResult = {
  url?: string;
  text?: string;
  cost?: number;
  raw: Record<string, unknown>;
};

export class LivepeerError extends Error {
  constructor(
    message: string,
    public capability: string,
    public retryable = false,
  ) {
    super(message);
  }
}

let clientPromise: Promise<Client> | null = null;

async function connect(): Promise<Client> {
  const headers: Record<string, string> = {};
  if (env.livepeerKey) headers.Authorization = `Bearer ${env.livepeerKey}`;
  const transport = new StreamableHTTPClientTransport(new URL(env.livepeerUrl), {
    requestInit: { headers },
  });
  const client = new Client({ name: "spec-ad-pitch", version: "0.1.0" });
  await client.connect(transport);
  return client;
}

async function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = connect().catch((e) => {
      clientPromise = null;
      throw e;
    });
  }
  return clientPromise;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const textOf = (r: ToolResult) =>
  (r.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text || "")
    .join("\n");

/** Call any MCP tool with reconnect + retry on transport failures. */
export async function callTool(
  name: string,
  args: Record<string, unknown>,
  { tries = 3, timeoutMs = 300_000 } = {},
): Promise<ToolResult> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const client = await getClient();
      return (await client.callTool({ name, arguments: args }, undefined, {
        timeout: timeoutMs,
        resetTimeoutOnProgress: true,
      })) as ToolResult;
    } catch (e) {
      lastErr = e;
      clientPromise = null; // force reconnect on the next attempt
      await sleep(1500 * (i + 1));
    }
  }
  throw lastErr;
}

type RunOpts = {
  prompt?: string;
  source_url?: string;
  inputs?: Record<string, unknown>;
  /** seconds; size it to the capability's p95 */
  timeout?: number;
  session_id?: string;
};

/**
 * Run one capability and wait for the final asset.
 * Slow capabilities come back as a job_id; we poll get_create_media until done.
 * Never re-submit on a stalled stream: the provider would bill twice.
 */
export async function runCapability(capability: string, opts: RunOpts): Promise<CapResult> {
  const args: Record<string, unknown> = { capability, timeout: opts.timeout ?? 60 };
  if (opts.prompt) args.prompt = opts.prompt;
  if (opts.source_url) args.source_url = opts.source_url;
  if (opts.inputs) args.inputs = opts.inputs;
  if (opts.session_id) args.session_id = opts.session_id;

  const r = await callTool("run_capability", args, { tries: 2 });
  const sc = (r.structuredContent || {}) as Record<string, unknown>;
  if (r.isError || sc.ok === false) {
    throw new LivepeerError(
      `${capability}: ${textOf(r).slice(0, 600)}`,
      capability,
      Boolean(sc.retryable),
    );
  }
  if (sc.job_id && !sc.url) return pollJob(String(sc.job_id), capability);
  return shape(sc, r);
}

async function pollJob(jobId: string, capability: string): Promise<CapResult> {
  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    await sleep(5000);
    let r: ToolResult;
    try {
      r = await callTool("get_create_media", { job_id: jobId }, { tries: 3 });
    } catch {
      continue;
    }
    const sc = (r.structuredContent || {}) as Record<string, unknown>;
    const status = String(sc.status || "");
    if (r.isError || status === "failed" || status === "error") {
      throw new LivepeerError(`${capability} job ${jobId}: ${textOf(r).slice(0, 400)}`, capability);
    }
    if (sc.url || status === "done" || status === "completed") return shape(sc, r);
  }
  throw new LivepeerError(`${capability} job ${jobId} timed out`, capability, true);
}

function shape(sc: Record<string, unknown>, r: ToolResult): CapResult {
  const result = (sc.result || {}) as Record<string, unknown>;
  return {
    url: (sc.url as string) || (result.url as string) || undefined,
    text: (result.text as string) || undefined,
    cost: typeof sc.cost_usd_estimated === "number" ? sc.cost_usd_estimated : 0,
    raw: { ...sc, _text: textOf(r) },
  };
}

/** Re-host bytes on Livepeer storage so every capability can read them by URL. */
export async function uploadBytes(data: Buffer, mime: string, filename: string): Promise<string> {
  const r = await callTool("upload", {
    data: data.toString("base64"),
    mime_type: mime,
    filename,
  });
  const sc = (r.structuredContent || {}) as Record<string, unknown>;
  const url = (sc.url || sc.hosted_url) as string | undefined;
  if (!url) throw new LivepeerError(`upload failed: ${textOf(r).slice(0, 300)}`, "upload");
  return url;
}

/** Re-host a public URL (e.g. a Shopify webp) on Livepeer storage. */
export async function rehostUrl(sourceUrl: string): Promise<string> {
  const r = await callTool("upload", { source_url: sourceUrl });
  const sc = (r.structuredContent || {}) as Record<string, unknown>;
  const url = (sc.url || sc.hosted_url) as string | undefined;
  if (!url) throw new LivepeerError(`rehost failed: ${textOf(r).slice(0, 300)}`, "upload");
  return url;
}

export async function spendStatus(): Promise<string> {
  const r = await callTool("spend_cap", {});
  return textOf(r);
}
