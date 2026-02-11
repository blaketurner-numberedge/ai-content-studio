#!/bin/bash
# AI Content Studio - One-Click Deployment Script
# Usage: ./scripts/deploy.sh [render-api-key] [vercel-token]

set -e

echo "🚀 AI Content Studio Deployment"
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check dependencies
command -v git >/dev/null 2>&1 || { echo -e "${RED}❌ git required${NC}"; exit 1; }

# Get repo info
REPO_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$REPO_URL" ]; then
  echo -e "${RED}❌ No git remote found${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Repository: $REPO_URL"

# Render Deploy (via Render Deploy Hook or API)
echo ""
echo "📦 Backend Deployment (Render)"
echo "-------------------------------"
echo "Option 1: Connect GitHub repo to Render"
echo "  1. Go to https://dashboard.render.com/select-repo?type=web"
echo "  2. Connect: $REPO_URL"
echo "  3. Use render.yaml (Blueprints) for auto-configuration"
echo ""
echo "Option 2: If using Render API key:"
echo "  render deploy --service ai-content-studio-api"

# Vercel Deploy
echo ""
echo "🌐 Frontend Deployment (Vercel)"
echo "--------------------------------"
echo "Option 1: Connect GitHub to Vercel"
echo "  1. Go to https://vercel.com/new"
echo "  2. Import: $REPO_URL"
echo "  3. Root Directory: frontend"
echo "  4. Add env var: VITE_API_URL=<your-render-url>"
echo ""
echo "Option 2: Deploy via CLI:"
echo "  cd frontend && vercel --prod"

# Environment Variables Checklist
echo ""
echo "🔐 Required Environment Variables"
echo "----------------------------------"
echo "Backend (Render):"
echo "  ✓ OPENAI_API_KEY      - Required for image generation"
echo "  ✓ STRIPE_SECRET_KEY   - Required for payments"
echo "  ✓ STRIPE_WEBHOOK_SECRET - For webhook verification"
echo "  ✓ CORS_ORIGIN         - Set to frontend URL after deploy"
echo ""
echo "Frontend (Vercel):"
echo "  ✓ VITE_API_URL        - Backend URL from Render"
echo ""

echo -e "${GREEN}✅ Deployment configs ready!${NC}"
echo ""
echo "Next steps:"
echo "  1. Go to Render dashboard → Blueprints → New Blueprint Instance"
echo "  2. Connect your GitHub repo"
echo "  3. Copy the backend URL once deployed"
echo "  4. Deploy frontend to Vercel with VITE_API_URL set"
echo "  5. Update Render's CORS_ORIGIN to your Vercel URL"
