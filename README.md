# NagarAI Backend

Local backend for the NagarAI civic issue detection system.

## What it provides

- FastAPI backend with `/analyze`, `/analyze/url`, `/issues`, `/reports`, and `/stats`
- PostgreSQL persistence for detected issues and complaint reports
- Complaint PDF generation with English and Hindi text
- Ward lookup using OpenStreetMap Nominatim reverse geocoding
- WhatsApp share links for generated complaint summaries

## Local setup

1. Copy `.env.example` to `.env` and fill in `VLM_API_URL` from your Colab ngrok endpoint.
2. Start PostgreSQL:
   ```bash
   docker compose up -d postgres
   ```
3. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
4. Run the API:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
5. Open `http://localhost:8000/docs`.

## Notes

- Complaint PDFs are written to `./complaints` and served from `/complaints`.
- Uploaded images are compressed to a maximum side length of 800 px before being sent to the VLM.
- If the Hindi font is missing, the backend will download Noto Sans Devanagari automatically when generating the first complaint PDF.
