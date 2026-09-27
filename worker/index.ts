import "./load-env";
import { startWorker } from "../src/lib/queue";
import { env } from "../src/lib/env";

if (!env.redisUrl) {
  console.error("REDIS_URL is not set. Without Redis the pipeline runs inline inside `npm run dev`, no worker needed.");
  process.exit(1);
}
const concurrency = Number(process.env.WORKER_CONCURRENCY || 3);
startWorker(concurrency);
console.log(`[worker] listening on "spec-ad" (mode=${env.livepeerMode}, concurrency=${concurrency})`);
