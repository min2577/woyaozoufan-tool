# 我要揍饭 - Deploy Notes

This repo is configured for deployment on Render.

## Live URL
https://woyaozoufan.onrender.com

## Architecture
- Frontend: Vite + React + TypeScript (in `project/`)
- Backend: Express + sql.js (in `server/`)
- Frontend is built into `project/dist/` and copied to `server/public/`
- The Express server serves both API and the built frontend (single domain)

## Local Dev
```bash
# Terminal 1: backend
cd server
npm install
cp .env.example .env  # edit with API keys
npm start

# Terminal 2: frontend
cd project
npm install
cp .env.example .env  # set VITE_API_BASE_URL=http://localhost:3001
npm run dev
```

Frontend: http://localhost:5174
Backend: http://localhost:3001

## Production Deploy
Pushed to GitHub, Render auto-builds via `render.yaml`.

## Data
- Recipes (1563 standard + outrageous) ship in `server/data/recipes.db`
- UserInventory starts empty on each deploy (free tier has no persistent disk)
