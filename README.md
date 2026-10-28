# Pools by Pros — Leads Dashboard

Next.js lead management dashboard (Leads + Analytics). Backend API runs on Google Cloud Functions in project `pools-by-pros`.

## Local development

```bash
cd frontend-cms
cp .env.local.example .env.local
npm install
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) (or the port Next assigns) and sign in with the team password from `.env.local`.

## Backend

```bash
cd ../backend-cms
npm run deploy:backend
```
