# Deploying ConstructTrack (Vercel + Supabase + self-hosted AI service)

Free-tier deployment for a live demo. Total time: about 30–45 minutes, most
of it waiting for builds.

| Part | Host | Why |
|---|---|---|
| Next.js web app + API | **Vercel** | Native Next.js hosting |
| PostgreSQL + image storage | **Supabase** | Free Postgres + private Storage bucket |
| Python YOLO11 AI service | **Self-hosted** (team machine or any Docker host) | PyTorch + YOLO11 is too large for Vercel functions; free Hugging Face Docker Spaces became paid in 2026 |

```text
Browser ──► Vercel (Next.js UI + API routes) ──► Supabase Postgres (Prisma)
                     │                     └──► Supabase Storage (signed URLs)
                     └──► Self-hosted AI service (FastAPI + YOLO11)  [X-API-Key]
```

---

## 1. Supabase (database + storage) — ~10 min

1. Create a project at <https://supabase.com> (pick the Mumbai / `ap-south-1` region).
2. **Database URL:** click **Connect** → **Session pooler** → copy the URI and
   put your database password in it. This is `DATABASE_URL`.
   (Use the *Session* pooler, not *Transaction*: it works for both Prisma
   migrations and serverless traffic.)
3. **Storage bucket:** Storage → **New bucket** → name it exactly
   `construction-images` → leave **Public** OFF (private).
4. **Keys:** Project Settings → API → copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only — never share)

## 2. AI service (self-hosted)

The web app works fully without the AI service (projects, progress, risk,
reports, PDFs, and every previously stored analysis). To run new analyses:

**Option A — local, results shared with the live site (recommended for demos).**
Point `web/.env` at the same Supabase values as Vercel, then:

```bash
# terminal 1
cd ai-service && source .venv/bin/activate
uvicorn app.main:app --port 8000
# terminal 2
cd web && npm run dev       # AI_SERVICE_URL=http://localhost:8000
```

Analyse images at `http://localhost:3000`; results are written to Supabase and
appear on the live Vercel site immediately.

**Option B — make "Analyse" work on the live site.** Expose the local service
with a tunnel (e.g. `ngrok http --url=<your-domain> 8000`) or run the
`Dockerfile` on any Docker host, then set `AI_SERVICE_URL` (and optionally
`AI_SERVICE_API_KEY`, matching the service's `SERVICE_API_KEY`) in Vercel.

## 3. Push the code to GitHub

```bash
cd "Minor project"
git add README.md ai-service web docs/DEPLOYMENT.md   # leaves the BuildBridge notes out
git commit -m "Deployment setup: Vercel build, AI service Dockerfile, upload compression"
git push
```

## 4. Vercel — ~5 min

1. <https://vercel.com/new> → import the `ConstructTrack` repo.
2. **Root Directory:** `web` (important). Framework preset: Next.js.
3. **Environment Variables:**

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Supabase session-pooler URI |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key |
   | `AI_SERVICE_URL` | *(optional, Option B only)* public URL of the AI service |
   | `AI_SERVICE_API_KEY` | *(optional)* same value as the service's `SERVICE_API_KEY` |

4. **Deploy.** The `vercel-build` script runs `prisma generate`,
   `prisma migrate deploy` (creates all tables in Supabase) and `next build`.

## 5. Load demo data — 1 min

From your laptop, once, pointing at the Supabase database:

```bash
cd web
DATABASE_URL="<supabase session-pooler URI>" npm run db:seed
```

This creates three realistic projects with three weeks of planned-vs-actual
history (one falling behind, so delay prediction and risk scoring have
something meaningful to show). Re-running it is safe — it upserts.

## 6. Before the demo (do this the evening before)

1. Open the Vercel URL → Projects → open the delayed project and upload 2–3
   construction-site photos.
2. Start the AI service and `npm run dev` locally (section 2, Option A) and
   click **Analyze** on each photo at `http://localhost:3000`. Results are
   saved in Supabase, so they display on the live site at any time.
3. Generate a report and download the PDF once.
4. **Before presenting:** start the AI service again if you want to run a
   live analysis, and check `http://localhost:8000/api/v1/health` shows
   `model_loaded: true`.

## Notes

- Large phone photos are automatically downscaled in the browser (max
  2048 px, JPEG) before upload, so they stay under Vercel's 4.5 MB request
  limit. Small images upload untouched.
- The analysis API route allows up to 60 s (`maxDuration`) for slower or
  remote AI-service hosts.
- Never commit `.env` files or the service-role key.
