# 🎨 AI Content Studio

> Generate, manage, and monetize AI-powered images with a complete studio platform

[![Deploy to Render](https://img.shields.io/badge/Deploy-Render-%2346E3B7?style=flat-square&logo=render)](https://render.com)
[![Deploy to Vercel](https://img.shields.io/badge/Deploy-Vercel-%23000000?style=flat-square&logo=vercel)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

![AI Content Studio Preview](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=600&fit=crop)

## ✨ Features

### 🖼️ AI Image Generation
- **Multiple Models** - DALL-E 3, DALL-E 2 support
- **Smart Prompting** - Built-in prompt library with categories
- **Batch Generation** - Generate up to 10 images at once
- **Variation Mode** - Create variations of existing images
- **Edit Mode** - Inpainting and image editing with masks

### 🏛️ Gallery & Asset Management
- **Organized Storage** - Automatic categorization by date
- **Metadata Tracking** - Full prompt, model, and parameter history
- **Batch Operations** - Download multiple images as ZIP
- **Quick Preview** - Lightbox viewer with full details
- **Export Options** - PNG, metadata JSON, bulk downloads

### 📚 Prompt Library
- **Curated Templates** - 30+ ready-to-use prompts
- **Categories** - Photography, Digital Art, Illustration, 3D, Abstract
- **Smart Suggestions** - Style modifiers and enhancers
- **Custom Prompts** - Save and organize your own prompts
- **One-Click Use** - Instant prompt population

### 💳 Credit System
- **Pay-As-You-Go** - Purchase credits via Stripe
- **Usage Tracking** - Real-time credit balance
- **Transparent Pricing** - Clear cost per generation
- **Secure Payments** - Stripe Checkout integration
- **No Subscriptions** - Buy what you need

### 📊 Analytics Dashboard
- **Revenue Tracking** - Daily/weekly/monthly earnings
- **Usage Metrics** - Generations, popular models, peak times
- **Conversion Stats** - Free → paid user analytics
- **Export Data** - CSV/JSON export for reporting

### 🔒 Enterprise Ready
- **CORS Configured** - Secure cross-origin requests
- **Health Checks** - Automated monitoring endpoints
- **Error Handling** - Graceful degradation
- **Type Safety** - Full TypeScript coverage

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- OpenAI API key
- Stripe account (for payments)

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-content-studio.git
cd ai-content-studio

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# Start development servers
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Visit `http://localhost:5173` to see the app.

## 🌐 Deployment

### One-Click Deploy (Recommended)

We provide a GitHub Actions workflow for automated deployment:

1. Fork this repository
2. Add secrets to GitHub (Settings → Secrets → Actions):
   - `RENDER_API_KEY` - Your Render API key
   - `RENDER_SERVICE_ID` - Render service ID
   - `VERCEL_TOKEN` - Vercel authentication token
3. Push to `main` branch - auto-deploy triggers automatically

### Manual Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed setup instructions.

## 💰 Monetization

AI Content Studio is built to generate revenue:

| Feature | Revenue Model |
|---------|---------------|
| Credit Packs | $5-50 per purchase |
| Image Generation | $0.02-0.08 per image |
| Bulk Discounts | Encourage larger purchases |
| Analytics | Track ROI in real-time |

**Revenue Potential:** $500-2000/month with moderate traffic

## 🛠️ Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (blazing fast builds)
- Tailwind CSS (beautiful UI)
- Lucide React (icons)

**Backend:**
- Express.js + TypeScript
- OpenAI SDK (DALL-E)
- Stripe SDK (payments)
- Multer (file uploads)

**Infrastructure:**
- Render (backend hosting)
- Vercel (frontend CDN)
- GitHub Actions (CI/CD)

## 📁 Project Structure

```
ai-content-studio/
├── backend/
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   └── index.ts      # Entry point
│   └── uploads/          # Generated images
├── frontend/
│   └── src/
│       ├── components/   # React components
│       ├── pages/        # Page components
│       └── lib/          # Utilities
└── .github/workflows/    # CI/CD automation
```

## 🔧 Configuration

### Required Environment Variables

**Backend (`.env`):**
```env
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
CORS_ORIGIN=https://your-frontend.vercel.app
PORT=3000
```

**Frontend (`.env`):**
```env
VITE_API_URL=https://your-backend.onrender.com
```

### Optional Configuration

- **Credit Pricing** - Edit `backend/src/routes/credits.ts`
- **Prompt Library** - Edit `backend/src/routes/prompts.ts`
- **Gallery Limits** - Configure in respective routes

## 📈 Analytics

Track your business metrics:

```
GET /api/analytics/revenue
GET /api/analytics/usage
GET /api/analytics/credits
GET /api/analytics/models
```

Dashboard includes:
- Revenue over time
- Generation counts
- Model popularity
- Credit purchases

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - feel free to use this for commercial projects!

## 🙏 Credits

- Built with [OpenAI](https://openai.com) DALL-E
- Payments by [Stripe](https://stripe.com)
- Icons by [Lucide](https://lucide.dev)

---

**Ready to launch your AI image business?** 🚀

[Deploy Now](#deployment) · [Report Bug](../../issues) · [Request Feature](../../issues)
