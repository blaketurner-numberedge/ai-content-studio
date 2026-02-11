# AI Content Studio - Deployment Guide

## Architecture
- **Frontend**: React + Vite (static)
- **Backend**: Express + TypeScript (Node.js)
- **Storage**: Local filesystem (uploads)

## Deployment Options

### Option 1: Vercel (Frontend) + Render (Backend) - RECOMMENDED

#### Step 1: Deploy Backend to Render
1. Push code to GitHub
2. Go to <https://render.com>
3. Create "New Web Service"
4. Connect your GitHub repo
5. Use these settings:
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && npm start`
   - **Environment Variables**:
     - `OPENAI_API_KEY` = your OpenAI API key
     - `CORS_ORIGIN` = `*` (or your frontend URL later)
   - **Disk**: Add a disk named `uploads` at `/opt/render/project/src/uploads`
6. Deploy and copy the service URL (e.g., `https://ai-content-studio-api.onrender.com`)

#### Step 2: Deploy Frontend to Vercel
1. Go to <https://vercel.com>
2. Import your GitHub repo
3. Set root directory to `frontend`
4. Add environment variable:
   - `VITE_API_URL` = your Render backend URL from Step 1
5. Deploy

#### Step 3: Update CORS
1. Go back to Render dashboard
2. Update `CORS_ORIGIN` to your Vercel frontend URL
3. Redeploy backend

---

### Option 2: Railway (Both Frontend + Backend)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init --name ai-content-studio

# Deploy backend
cd backend
railway up

# Deploy frontend
cd ../frontend
railway up
```

---

### Option 3: Self-Hosted (VPS/Dedicated Server)

```bash
# Clone repo
git clone <your-repo>
cd ai-content-studio

# Install dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Build frontend
cd frontend && npm run build && cd ..

# Set environment variables
export OPENAI_API_KEY="sk-..."
export PORT=3000
export CORS_ORIGIN="*"

# Start backend
cd backend && npm start
```

Frontend build will be in `frontend/dist/` - serve with nginx or any static server.

---

## Post-Deployment Checklist

- [ ] Backend health check passes (`/health`)
- [ ] Image generation works
- [ ] Gallery loads correctly
- [ ] Prompt library loads
- [ ] CORS is configured properly
- [ ] Uploads directory persists (for Render: disk attached)

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for image generation |
| `PORT` | No | Backend port (default: 3000) |
| `CORS_ORIGIN` | No | Frontend URL for CORS (default: *) |
| `VITE_API_URL` | For frontend | Backend API URL |
