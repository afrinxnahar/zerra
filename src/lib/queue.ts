import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { env, hasRedis } from "./env";
import { runStep } from "./pipeline/steps";
import type { Step } from "./types";

/**
 * Job chain per variant: script -> visuals -> audio -> motion -> mux.
 * Each finished step enqueues the next one, so a crash only loses one step
 * and every step retries on its own.
 *
 * With REDIS_URL set, jobs go to BullMQ and `npm run worker` processes them.
 * Without it, the chain runs inline in the Next.js server process (fine for local dev).
 */

export const QUEUE = "spec-ad";
type JobData = { variantId: string; step: Step };

let conn: IORedis | null = null;
let queue: Queue<JobData> | null = null;
export function redis() {
  if (!conn) conn = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });
  return conn;
}
function q() {
  if (!queue) queue = new Queue<JobData>(QUEUE, { connection: redis() });
  return queue;
}

export async function enqueue(variantId: string, step: Step = "script") {
  if (hasRedis()) {
    await q().add(step, { variantId, step }, {
      attempts: 2,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 500,
      removeOnFail: 500,
    });
    return;
  }
  // inline mode: run the chain in the background of this process
  void (async () => {
    let s: Step | null = step;
    while (s) s = await runStep(variantId, s);
  })().catch((e) => console.error("[inline queue]", e));
}

export function startWorker(concurrency = 3) {
  const worker = new Worker<JobData>(
    QUEUE,
    async (job: Job<JobData>) => {
      const next = await runStep(job.data.variantId, job.data.step);
      if (next) await enqueue(job.data.variantId, next);
      return { next };
    },
    { connection: redis(), concurrency },
  );
  worker.on("failed", (job, err) => console.error(`[worker] ${job?.name} ${job?.data.variantId} failed`, err.message));
  worker.on("completed", (job) => console.log(`[worker] ${job.name} ${job.data.variantId} done`));
  return worker;
}
