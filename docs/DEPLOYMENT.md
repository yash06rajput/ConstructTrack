# Deploying ConstructTrack (Vercel + Supabase + Hugging Face)

Free-tier deployment for a live demo. Total time: about 30–45 minutes, most
of it waiting for builds.

| Part | Host | Why |
|---|---|---|
| Next.js web app + API | **Vercel** | Native Next.js hosting |
| PostgreSQL + image storage | **Supabase** | Free Postgres + private Storage bucket |
| Python YOLO11 AI service | **Hugging Face Space** (Docker) | Free CPU with 16 GB RAM — PyTorch + YOLO11 is too large for Vercel functions |

```text
Browser ──► Vercel (Next.js UI + API routes) ──► Supabase Postgres (Prisma)
                     │                     └──► Supabase Storage (signed URLs)
                     └──► Hugging Face Space (FastAPI + YOLO11)  [X-API-Key]
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

## 2. AI service on Hugging Face Spaces — ~15 min (mostly build time)

1. <https://huggingface.co/new-space> → SDK **Docker** → template **Blank** →
   hardware **CPU basic (free)** → visibility Public.
2. Upload these from `ai-service/` to the Space root (Files → Add file → Upload):
   - `Dockerfile`
   - `requirements.txt`
   - the whole `app/` folder
   - `hf-space-README.md`, **renamed to `README.md`** (replace the Space's default README)
3. Space → Settings → **Variables and secrets** → New secret
   `SERVICE_API_KEY` = any long random string (e.g. from
   `openssl rand -hex 24`). Keep it; Vercel needs the same value.
4. Wait for the build to show **Running**, then open
   `https://<your-username>-<space-name>.hf.space/api/v1/health` — it should
   return `model_loaded: true`. That base URL (no trailing slash) is
   `AI_SERVICE_URL`.

> Alternative: the same Dockerfile deploys unchanged on Render or Railway
> (they set `$PORT` automatically). Render's free 512 MB instance is too
> small for PyTorch; use a paid instance there.

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
   | `AI_SERVICE_URL` | `https://<user>-<space>.hf.space` |
   | `AI_SERVICE_API_KEY` | same value as the Space's `SERVICE_API_KEY` |

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

1. Open the Vercel URL → Projects → open the delayed project.
2. Upload 2–3 real construction-site photos and click **Analyze** on each.
   Results are saved in the database, so they display instantly during the
   demo even if the AI service is asleep.
3. Generate a report and download the PDF once.
4. **5 minutes before presenting:** open the Space's `/api/v1/health` URL so
   it is awake (free Spaces sleep after inactivity; the first request after
   sleeping takes ~1 minute).

## Notes

- Large phone photos are automatically downscaled in the browser (max
  2048 px, JPEG) before upload, so they stay under Vercel's 4.5 MB request
  limit. Small images upload untouched.
- The analysis API route allows up to 60 s (`maxDuration`) to cover a
  Space waking up.
- Never commit `.env` files or the service-role key.
