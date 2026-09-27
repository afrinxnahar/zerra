import type { NextConfig } from "next";
import dotenv from "dotenv";

// Secrets live in keys.env (gitignored). Loaded here so API routes can read them.
dotenv.config({ path: "keys.env", quiet: true });

const nextConfig: NextConfig = {
  serverExternalPackages: ["bullmq", "ioredis"],
  images: { unoptimized: true },
  experimental: {
    // brand product photos go through a server action; Vercel caps request bodies at 4.5 MB
    serverActions: { bodySizeLimit: "4.5mb" },
  },
};

export default nextConfig;
