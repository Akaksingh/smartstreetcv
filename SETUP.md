# NagarAI Setup & Deployment Guide

This guide walks you through setting up NagarAI for **local development** (100% offline and free using Ollama) and deploying it to the **cloud** (100% free using Supabase, Railway, and Gemini).

---

## 1. System Architecture

To understand how local development and production hosting differ, see the diagram below:

```
[ Local Development (Offline & Free) ]
   User Upload --> FastAPI Backend (Port 8000)
                         |
                         +--> VLM Proxy (Port 8001) --> Local Ollama (qwen2-vl)
                         +--> Local PostgreSQL (Port 5432)

[ Deployed Production (Cloud & Free) ]
   User Upload --> Deployed FastAPI (Railway/Render)
                         |
                         +--> Google Gemini API (Free multimodal VLM & complaint drafter)
                         +--> Deployed Supabase PostgreSQL (Free tier)
```

By swapping the **VLM API URL** in production to call a hosted serverless API (like Google's free Gemini API), you avoid paying hundreds of dollars a month for GPU cloud hosting.

---

## 2. Local Development Setup (Ollama Way)

Follow these steps to run the complete stack locally on your computer.

### Step 1: Install and Run Ollama
1. Download and install Ollama from [ollama.com](https://ollama.com).
2. Open a terminal and run the Vision-Language Model:
   ```bash
   ollama run qwen2-vl
   ```
   *Note: The first download of `qwen2-vl` (approx. 4.5 GB) may take a few minutes.*

### Step 2: Start the PostgreSQL Database
Make sure Docker Desktop is running, then start the database container:
```bash
docker compose up -d postgres
```

### Step 3: Run the Local VLM Proxy Server
This proxy translates FastAPI request formats into Ollama's native `/api/chat` format and loads your [vlm_system_prompt.md](vlm_system_prompt.md) instructions.
1. Open a new terminal window in the workspace root.
2. Start the proxy:
   ```bash
   backend\.venv\Scripts\python vlm_server.py
   ```
   *The proxy will run on `http://localhost:8001`.*

### Step 4: Configure the Backend Environment
1. Copy the example environment file inside the `backend` folder:
   ```bash
   cp .env.example .env
   ```
2. Open `backend/.env` and configure the local URLs:
   ```env
   VLM_API_URL=http://localhost:8001
   DATABASE_URL=postgresql://nagarai:nagarai@localhost:5432/nagarai
   SECRET_KEY=dev-secret-key-12345
   GEMINI_API_KEY=optional
   ```

### Step 5: Start the Backend Server
1. Open a separate terminal window and go to the `backend` directory:
   ```bash
   cd backend
   ```
2. Run database migrations:
   ```bash
   .venv\Scripts\alembic upgrade head
   ```
3. Start the FastAPI application:
   ```bash
   .venv\Scripts\uvicorn main:app --reload --port 8000
   ```
4. Access the API documentation at `http://localhost:8000/docs`.

---

## 3. Production Deployment Guide (100% Free Cloud Hosting)

When you are ready to host the application online for interviews or public demos, follow these steps to deploy for **₹0**:

### Step 1: Set up the Deployed Database (Supabase)
1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Create a new project named `NagarAI`.
3. Go to **Project Settings** -> **Database** and copy your **Connection String (URI)**. It will look like:
   `postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres`
4. This URI will be your production `DATABASE_URL`.

### Step 2: Set up the Deployed VLM (Gemini Free Tier)
To host the vision processing online without paying for a GPU cloud:
1. Go to [Google AI Studio](https://aistudio.google.com) and click **Get API Key** (100% free, no credit card required).
2. Generate an API key.
3. Configure your production environment variables (on Railway) with:
   - `GEMINI_API_KEY=your_google_ai_studio_key`
   - *Note: Our backend is designed to automatically utilize your Gemini API Key as a serverless Vision-Language Model and Complaint Drafter, requiring no cloud servers for Qwen2-VL.*

### Step 3: Deploy the Backend (Railway or Render)
Both Railway and Render offer free tiers that support Docker deployments:
1. Push your code to your GitHub repository.
2. Sign in to [Railway.app](https://railway.app) using your GitHub account.
3. Click **New Project** -> **Deploy from GitHub repo** -> select `smartstreetcv`.
4. Railway will read the [Dockerfile](backend/Dockerfile) in the `backend` folder and deploy it automatically.
5. In the Railway project dashboard, go to the **Variables** tab and add:
   - `DATABASE_URL` (Your Supabase connection string)
   - `GEMINI_API_KEY` (Your Google AI Studio key)
   - `SECRET_KEY` (A random secure string)
6. Railway will generate a public URL for your backend (e.g., `https://nagarai-backend.up.railway.app`).

### Step 4: Deploy the Frontend (Vercel or Netlify)
Once the React frontend is built:
1. Create a free account on [Vercel](https://vercel.com).
2. Connect your GitHub repository.
3. Add the environment variable pointing to your deployed backend URL:
   `REACT_APP_API_URL=https://nagarai-backend.up.railway.app`
4. Deploy. Vercel will host your web page on a free CDN with SSL.

---

## 4. Environment Variables Reference

| Variable Name | Local Dev Value | Production (Cloud) Value | Purpose |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://nagarai:nagarai@localhost:5432/nagarai` | `postgresql://postgres:[pw]@db.supabase.co:5432/postgres` | PostgreSQL connection string |
| `VLM_API_URL` | `http://localhost:8001` | *(Handled via Gemini API)* | Vision-Language Model endpoint |
| `GEMINI_API_KEY` | `optional` | `AIzaSy...` (Get from Google AI Studio) | Multimodal engine & complaint generator key |
| `SECRET_KEY` | `dev-secret-key-12345` | `[Secure Random String]` | JWT & cookie signing token |
