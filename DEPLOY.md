# NagarAI — Full Cloud Deployment Guide

This guide deploys NagarAI so it runs 24/7 with no laptop needed.

**Stack:**
- Frontend → [Vercel](https://vercel.com) (free)
- Backend → [Railway](https://railway.app) (free $5 credit/month)
- Database → [Neon.tech](https://neon.tech) (free PostgreSQL)
- Images → [Cloudinary](https://cloudinary.com) (free 25GB)
- AI/VLM → [Google Gemini 1.5 Flash](https://aistudio.google.com) (free 1500 req/day)

---

## Step 1 — Get Your Free API Keys

### 1a. Google Gemini API Key (for AI analysis)
1. Go to https://aistudio.google.com/app/apikey
2. Click **Create API Key**
3. Copy the key → save as `GEMINI_API_KEY`

### 1b. Cloudinary (for image storage)
1. Go to https://cloudinary.com and sign up (free)
2. Dashboard → copy the **API Environment variable** string
   - Looks like: `cloudinary://123456789:AbCdEfGhIjKlMnOpQrStUvWxYz@your-cloud-name`
3. Save as `CLOUDINARY_URL`

### 1c. Neon.tech PostgreSQL (free database)
1. Go to https://neon.tech and sign up (free)
2. Create a new project named **nagarai**
3. Copy the connection string → save as `DATABASE_URL`
   - Looks like: `postgresql://user:password@ep-xxx.region.aws.neon.tech/nagarai?sslmode=require`

---

## Step 2 — Deploy the Backend to Railway

1. Go to https://railway.app and sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select **Akaksingh/smartstreetcv**
4. When asked for the directory, set it to: **`backend`**
5. Railway will detect it's a Python app and build it

### Set Environment Variables in Railway:
Go to your service → **Variables** tab → Add:

```
GEMINI_API_KEY         = your-gemini-key-here
DATABASE_URL           = your-neon-connection-string-here
CLOUDINARY_URL         = cloudinary://your-cloudinary-env-var
SECRET_KEY             = any-random-long-string-like-abc123xyz789
COMPLAINTS_DIR         = /tmp/complaints
UPLOAD_DIR             = /tmp/complaints/uploads
FONT_DIR               = /tmp/complaints/fonts
```

6. Click **Deploy**. Wait ~2 minutes.
7. After deploy, go to **Settings** → **Networking** → **Generate Domain**
8. Copy your Railway URL (e.g. `https://nagarai-backend-production.up.railway.app`)

---

## Step 3 — Deploy the Frontend to Vercel

1. Go to https://vercel.com and sign up with GitHub
2. Click **Add New** → **Project**
3. Import **Akaksingh/smartstreetcv**
4. Under **Root Directory** → set to **`frontend`**
5. Under **Environment Variables** → add:
   ```
   NEXT_PUBLIC_API_URL = https://your-railway-url.up.railway.app
   ```
   *(Replace with your actual Railway URL from Step 2)*
6. Click **Deploy**. Wait ~1 minute.
7. Your site is live at `https://nagarai-frontend.vercel.app` 🎉

---

## Step 4 — Run Database Migrations

After Railway deploys, open a Railway terminal:
1. Go to Railway → Your backend service → **Shell** tab
2. Run:
   ```bash
   alembic upgrade head
   ```

---

## Step 5 — Verify Everything Works

1. Open your Vercel URL
2. Upload a test photo
3. You should see AI analysis results in 2-3 seconds (Gemini is fast!)
4. Open the Map page — your issue should appear as a pin

---

## Switching Back to Ollama (Local Mode)

In Railway environment variables:
- **Remove** `GEMINI_API_KEY`
- **Add** `VLM_API_URL = http://your-ngrok-or-tunnel-url`

The backend auto-detects and switches.

---

## Cost Summary

| Service | Free Tier Limit | Cost If Exceeded |
|---|---|---|
| Vercel | Unlimited hobby deploys | $20/month Pro |
| Railway | $5 credit/month (~500 hrs) | $0.000463/vCPU-sec |
| Neon.tech | 512MB storage, 191 compute hrs | $0.16/hr |
| Cloudinary | 25GB storage, 25GB bandwidth | $89/month |
| Gemini API | 1500 requests/day | $0.075 per 1M tokens |

**For a typical civic portal: $0/month** unless you exceed 1500 AI analyses per day.
