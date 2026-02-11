"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const images_1 = require("./routes/images");
const gallery_1 = require("./routes/gallery");
const prompts_1 = require("./routes/prompts");
const credits_1 = require("./routes/credits");
const analytics_1 = require("./routes/analytics");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express_1.default.json({ limit: '50mb' }));
// Stripe webhook needs raw body
app.use('/api/credits/webhook', express_1.default.raw({ type: 'application/json' }));
// Static files for uploads
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API routes
app.use('/api/images', images_1.imageRoutes);
app.use('/api/gallery', gallery_1.galleryRoutes);
app.use('/api/prompts', prompts_1.promptRoutes);
app.use('/api/credits', credits_1.creditRoutes);
app.use('/api/analytics', analytics_1.analyticsRoutes);
// Error handling
app.use((err, _req, res, _next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});
app.listen(PORT, () => {
    console.log(`🚀 AI Content Studio API running on port ${PORT}`);
    console.log(`📁 Upload directory: ${path_1.default.join(__dirname, '../uploads')}`);
});
//# sourceMappingURL=index.js.map