# Learnify

Teacher Attention Amplifier

## Architecture

Frontend:
Vercel (React + Vite)

Backend:
Render (Node.js + Express)

Database:
Supabase PostgreSQL

AI:
Gemini

Document processing:
Python subprocesses

## Local Development

1. **Frontend Setup**:
   - `cd Frontend`
   - `npm install`
   - `npm run dev`

2. **Backend Setup**:
   - `cd Backend`
   - `npm install`
   - `npm start` (or `npm run dev`)

3. **Python Dependencies**:
   - Make sure Python 3.10+ is installed.
   - The dockerfile installs global packages via pip, or locally use `pip install -r requirements.txt` if created. Currently: `pip install python-dotenv google-generativeai pypdf pytextrank spacy networkx sentence-transformers scikit-learn` followed by `python -m spacy download en_core_web_sm`

4. **Environment Variables**:
   See `.env.example` in `Backend` and `Frontend` for reference.

5. **Database Setup**:
   Setup Supabase with tables for `courses`, `users`, `course_members`, etc.

## Deployment

### Vercel
Root directory: `Frontend`
Build command: `npm run build`
Output directory: `dist`
Environment variable: `VITE_API_URL`

### Render
Root directory: `Backend`
Runtime: Docker
Dockerfile: `/Backend/Dockerfile`
Health check: `/health`
Environment variables: `PORT`, `NODE_ENV`, `FRONTEND_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, etc.

### Supabase
Ensure proper RLS policies are intact, and service keys are properly maintained.
