import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { imageRoutes } from './routes/images';
import { galleryRoutes } from './routes/gallery';
import { promptRoutes } from './routes/prompts';
import { creditRoutes } from './routes/credits';
import { analyticsRoutes } from './routes/analytics';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Stripe webhook needs raw body
app.use('/api/credits/webhook', express.raw({ type: 'application/json' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (_req, res) => {
  const { DEMO_MODE } = require('./services/openai');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    demoMode: DEMO_MODE,
    message: DEMO_MODE ? 'Running in demo mode - add OPENAI_API_KEY for real generations' : undefined
  });
});

// API routes
app.use('/api/images', imageRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 AI Content Studio API running on port ${PORT}`);
  console.log(`📁 Upload directory: ${path.join(__dirname, '../uploads')}`);
});
