"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRoutes = void 0;
exports.trackEvent = trackEvent;
const express_1 = require("express");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
exports.analyticsRoutes = router;
const ANALYTICS_FILE = path_1.default.join(__dirname, '../../data/analytics.json');
// Initialize analytics
async function initAnalytics() {
    try {
        const data = await promises_1.default.readFile(ANALYTICS_FILE, 'utf-8');
        return JSON.parse(data);
    }
    catch {
        const initial = {
            events: [],
            daily: {},
            summary: {
                totalImagesGenerated: 0,
                totalImagesFailed: 0,
                totalCreditsPurchased: 0,
                totalCreditsUsed: 0,
                totalRevenue: 0,
                uniqueUsers: 0,
                topModels: [],
                conversionRate: 0,
                avgRevenuePerUser: 0,
                lastUpdated: new Date().toISOString(),
            },
        };
        await promises_1.default.mkdir(path_1.default.dirname(ANALYTICS_FILE), { recursive: true });
        await promises_1.default.writeFile(ANALYTICS_FILE, JSON.stringify(initial, null, 2));
        return initial;
    }
}
// Save analytics
async function saveAnalytics(data) {
    await promises_1.default.writeFile(ANALYTICS_FILE, JSON.stringify(data, null, 2));
}
// Track event
async function trackEvent(type, userId, metadata = {}) {
    const data = await initAnalytics();
    const event = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        userId,
        timestamp: new Date().toISOString(),
        metadata,
    };
    data.events.push(event);
    // Keep only last 10,000 events to prevent file bloat
    if (data.events.length > 10000) {
        data.events = data.events.slice(-10000);
    }
    // Update daily stats
    const date = new Date().toISOString().split('T')[0];
    if (!data.daily[date]) {
        data.daily[date] = {
            date,
            imagesGenerated: 0,
            imagesFailed: 0,
            creditsPurchased: 0,
            creditsUsed: 0,
            revenue: 0,
            uniqueUsers: [],
            modelsUsed: {},
        };
    }
    const daily = data.daily[date];
    switch (type) {
        case 'image_generated':
            daily.imagesGenerated++;
            data.summary.totalImagesGenerated++;
            if (metadata.model) {
                daily.modelsUsed[metadata.model] = (daily.modelsUsed[metadata.model] || 0) + 1;
            }
            break;
        case 'image_failed':
            daily.imagesFailed++;
            data.summary.totalImagesFailed++;
            break;
        case 'credits_purchased':
            daily.creditsPurchased += metadata.credits || 0;
            data.summary.totalCreditsPurchased += metadata.credits || 0;
            if (metadata.amount) {
                daily.revenue += metadata.amount;
                data.summary.totalRevenue += metadata.amount;
            }
            break;
        case 'credits_used':
            daily.creditsUsed += metadata.credits || 0;
            data.summary.totalCreditsUsed += metadata.credits || 0;
            break;
        case 'gallery_export':
            // Track exports for engagement metrics
            break;
        case 'prompt_used':
            // Track prompt library usage
            break;
    }
    // Track unique users
    if (!daily.uniqueUsers.includes(userId)) {
        daily.uniqueUsers.push(userId);
    }
    // Recalculate summary
    const allUsers = new Set(data.events.map(e => e.userId));
    const purchasingUsers = new Set(data.events
        .filter(e => e.type === 'credits_purchased')
        .map(e => e.userId));
    data.summary.uniqueUsers = allUsers.size;
    data.summary.conversionRate = allUsers.size > 0
        ? (purchasingUsers.size / allUsers.size) * 100
        : 0;
    data.summary.avgRevenuePerUser = allUsers.size > 0
        ? data.summary.totalRevenue / allUsers.size
        : 0;
    // Calculate top models
    const modelCounts = {};
    data.events
        .filter(e => e.type === 'image_generated' && e.metadata.model)
        .forEach(e => {
        modelCounts[e.metadata.model] = (modelCounts[e.metadata.model] || 0) + 1;
    });
    data.summary.topModels = Object.entries(modelCounts)
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    data.summary.lastUpdated = new Date().toISOString();
    await saveAnalytics(data);
}
// Get summary stats
router.get('/summary', async (_req, res) => {
    try {
        const data = await initAnalytics();
        res.json(data.summary);
    }
    catch (error) {
        console.error('Analytics summary error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});
// Get daily stats (last 30 days)
router.get('/daily', async (req, res) => {
    try {
        const data = await initAnalytics();
        const days = parseInt(req.query.days) || 30;
        const sortedDates = Object.keys(data.daily).sort().slice(-days);
        const dailyStats = sortedDates.map(date => ({
            ...data.daily[date],
            uniqueUsers: data.daily[date].uniqueUsers.length,
        }));
        res.json(dailyStats);
    }
    catch (error) {
        console.error('Analytics daily error:', error);
        res.status(500).json({ error: 'Failed to get daily stats' });
    }
});
// Get model usage breakdown
router.get('/models', async (_req, res) => {
    try {
        const data = await initAnalytics();
        res.json(data.summary.topModels);
    }
    catch (error) {
        console.error('Analytics models error:', error);
        res.status(500).json({ error: 'Failed to get model stats' });
    }
});
// Get recent events (with pagination)
router.get('/events', async (req, res) => {
    try {
        const data = await initAnalytics();
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const events = data.events
            .slice()
            .reverse()
            .slice(offset, offset + limit);
        res.json({
            events,
            total: data.events.length,
            hasMore: offset + limit < data.events.length,
        });
    }
    catch (error) {
        console.error('Analytics events error:', error);
        res.status(500).json({ error: 'Failed to get events' });
    }
});
// Get funnel metrics
router.get('/funnel', async (_req, res) => {
    try {
        const data = await initAnalytics();
        const uniqueUsers = new Set(data.events.map(e => e.userId)).size;
        const generatingUsers = new Set(data.events.filter(e => e.type === 'image_generated').map(e => e.userId)).size;
        const purchasingUsers = new Set(data.events.filter(e => e.type === 'credits_purchased').map(e => e.userId)).size;
        res.json({
            totalUsers: uniqueUsers,
            generatingUsers,
            purchasingUsers,
            generationRate: uniqueUsers > 0 ? (generatingUsers / uniqueUsers) * 100 : 0,
            purchaseRate: uniqueUsers > 0 ? (purchasingUsers / uniqueUsers) * 100 : 0,
            purchaseRateFromGenerators: generatingUsers > 0 ? (purchasingUsers / generatingUsers) * 100 : 0,
        });
    }
    catch (error) {
        console.error('Analytics funnel error:', error);
        res.status(500).json({ error: 'Failed to get funnel metrics' });
    }
});
// Health check
router.get('/health', async (_req, res) => {
    try {
        const data = await initAnalytics();
        res.json({
            status: 'healthy',
            totalEvents: data.events.length,
            daysTracked: Object.keys(data.daily).length,
            lastUpdated: data.summary.lastUpdated,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'unhealthy', error: String(error) });
    }
});
//# sourceMappingURL=analytics.js.map