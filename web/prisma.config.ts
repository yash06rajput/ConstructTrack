// Prisma 6's prisma.config.ts opts OUT of the CLI's old implicit
// ".env next to schema.prisma" auto-loading (hence "Prisma config
// detected, skipping environment variable loading" from `prisma db pull`
// etc.) — this file now has to load .env itself, before defineConfig()
// runs, or `env("DATABASE_URL")` in schema.prisma resolves to nothing.
// This only affects standalone `npx prisma ...` CLI invocations; the
// Next.js app itself (`npm run dev`) loads .env via its own built-in
// loader and is unaffected either way.
import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
