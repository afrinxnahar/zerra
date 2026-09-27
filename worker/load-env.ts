import dotenv from "dotenv";
// keys.env holds every secret (Livepeer, Supabase, Redis). .env.local also works.
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: "keys.env", quiet: true });
