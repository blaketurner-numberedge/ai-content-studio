"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.creditRoutes = exports.MODEL_CREDIT_COSTS = exports.CREDIT_TIERS = void 0;
exports.getUserCredits = getUserCredits;
exports.useCredits = useCredits;
exports.addCredits = addCredits;
const express_1 = require("express");
const stripe_1 = __importDefault(require("stripe"));
const zod_1 = require("zod");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const analytics_1 = require("./analytics");
const router = (0, express_1.Router)();
exports.creditRoutes = router;
// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
    ? new stripe_1.default(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-01-28.clover' })
    : null;
// Credit pricing tiers
exports.CREDIT_TIERS = [
    { id: 'starter', name: 'Starter', credits: 10, price: 500, description: '10 images' },
    { id: 'pro', name: 'Pro', credits: 50, price: 2000, description: '50 images (20% off)' },
    { id: 'business', name: 'Business', credits: 200, price: 6000, description: '200 images (40% off)' },
];
// Credit costs per model
exports.MODEL_CREDIT_COSTS = {
    'dall-e-2': 1,
    'dall-e-3': 2,
    'gpt-image-1': 3,
    'gpt-image-1-mini': 1,
};
const CREDITS_FILE = path_1.default.join(__dirname, '../../data/credits.json');
const PAYMENTS_FILE = path_1.default.join(__dirname, '../../data/payments.json');
// Initialize data directory
async function initDataDir() {
    const dataDir = path_1.default.dirname(CREDITS_FILE);
    await promises_1.default.mkdir(dataDir, { recursive: true });
    try {
        await promises_1.default.access(CREDITS_FILE);
    }
    catch {
        await promises_1.default.writeFile(CREDITS_FILE, JSON.stringify({}));
    }
    try {
        await promises_1.default.access(PAYMENTS_FILE);
    }
    catch {
        await promises_1.default.writeFile(PAYMENTS_FILE, JSON.stringify([]));
    }
}
initDataDir();
// Get user ID from request (simple device-based for now)
function getUserId(req) {
    return req.headers['x-device-id'] || 'anonymous';
}
// Read credits data
async function getCreditsData() {
    try {
        const data = await promises_1.default.readFile(CREDITS_FILE, 'utf-8');
        return JSON.parse(data);
    }
    catch {
        return {};
    }
}
// Write credits data
async function saveCreditsData(data) {
    await promises_1.default.writeFile(CREDITS_FILE, JSON.stringify(data, null, 2));
}
// Read payments data
async function getPaymentsData() {
    try {
        const data = await promises_1.default.readFile(PAYMENTS_FILE, 'utf-8');
        return JSON.parse(data);
    }
    catch {
        return [];
    }
}
// Write payments data
async function savePaymentsData(data) {
    await promises_1.default.writeFile(PAYMENTS_FILE, JSON.stringify(data, null, 2));
}
// Get or create user credits
async function getUserCredits(userId) {
    const data = await getCreditsData();
    if (!data[userId]) {
        data[userId] = {
            balance: 5, // Free starter credits
            totalPurchased: 0,
            totalUsed: 0,
            updatedAt: new Date().toISOString(),
        };
        await saveCreditsData(data);
    }
    return data[userId];
}
// Use credits
async function useCredits(userId, amount) {
    const data = await getCreditsData();
    if (!data[userId] || data[userId].balance < amount) {
        return false;
    }
    data[userId].balance -= amount;
    data[userId].totalUsed += amount;
    data[userId].updatedAt = new Date().toISOString();
    await saveCreditsData(data);
    return true;
}
// Add credits
async function addCredits(userId, amount, amountPaid) {
    const data = await getCreditsData();
    if (!data[userId]) {
        data[userId] = {
            balance: 0,
            totalPurchased: 0,
            totalUsed: 0,
            updatedAt: new Date().toISOString(),
        };
    }
    data[userId].balance += amount;
    data[userId].totalPurchased += amount;
    data[userId].updatedAt = new Date().toISOString();
    await saveCreditsData(data);
    // Track purchase
    await (0, analytics_1.trackEvent)('credits_purchased', userId, {
        credits: amount,
        amount: amountPaid || 0,
    });
    return data[userId];
}
// Get credit balance
router.get('/balance', async (req, res) => {
    try {
        const userId = getUserId(req);
        const credits = await getUserCredits(userId);
        res.json({
            balance: credits.balance,
            totalPurchased: credits.totalPurchased,
            totalUsed: credits.totalUsed,
        });
    }
    catch (error) {
        console.error('Balance error:', error);
        res.status(500).json({ error: 'Failed to get balance' });
    }
});
// Get pricing tiers
router.get('/tiers', (_req, res) => {
    res.json(exports.CREDIT_TIERS);
});
// Get model costs
router.get('/model-costs', (_req, res) => {
    res.json(exports.MODEL_CREDIT_COSTS);
});
// Create checkout session
router.post('/checkout', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }
        const schema = zod_1.z.object({ tierId: zod_1.z.string() });
        const { tierId } = schema.parse(req.body);
        const userId = getUserId(req);
        const tier = exports.CREDIT_TIERS.find(t => t.id === tierId);
        if (!tier) {
            return res.status(400).json({ error: 'Invalid tier' });
        }
        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${tier.name} - ${tier.description}`,
                            description: `${tier.credits} AI image generation credits`,
                        },
                        unit_amount: tier.price,
                    },
                    quantity: 1,
                }],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/credits?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/credits?canceled=true`,
            metadata: {
                userId,
                tierId,
                credits: tier.credits.toString(),
            },
        });
        // Record pending payment
        const payments = await getPaymentsData();
        payments.push({
            id: `pay_${Date.now()}`,
            userId,
            tierId,
            credits: tier.credits,
            amount: tier.price,
            status: 'pending',
            stripeSessionId: session.id,
            createdAt: new Date().toISOString(),
        });
        await savePaymentsData(payments);
        res.json({ sessionId: session.id, url: session.url });
    }
    catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ error: 'Failed to create checkout' });
    }
});
// Verify session and add credits
router.post('/verify', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }
        const schema = zod_1.z.object({ sessionId: zod_1.z.string() });
        const { sessionId } = schema.parse(req.body);
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Payment not completed' });
        }
        const userId = session.metadata?.userId;
        const credits = parseInt(session.metadata?.credits || '0');
        if (!userId || !credits) {
            return res.status(400).json({ error: 'Invalid session metadata' });
        }
        // Update payment status
        const payments = await getPaymentsData();
        const payment = payments.find(p => p.stripeSessionId === sessionId);
        if (payment && payment.status === 'pending') {
            payment.status = 'completed';
            payment.completedAt = new Date().toISOString();
            await savePaymentsData(payments);
            // Add credits to user with amount paid
            await addCredits(userId, credits, payment.amount);
        }
        const userCredits = await getUserCredits(userId);
        res.json({ success: true, creditsAdded: credits, balance: userCredits.balance });
    }
    catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});
// Stripe webhook
router.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !endpointSecret) {
        return res.status(503).json({ error: 'Stripe not configured' });
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    }
    catch (err) {
        console.error('Webhook signature error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const credits = parseInt(session.metadata?.credits || '0');
        if (userId && credits) {
            // Update payment status if not already done
            const payments = await getPaymentsData();
            const payment = payments.find(p => p.stripeSessionId === session.id);
            if (payment && payment.status === 'pending') {
                payment.status = 'completed';
                payment.completedAt = new Date().toISOString();
                await savePaymentsData(payments);
                await addCredits(userId, credits, payment?.amount);
                console.log(`✅ Added ${credits} credits to user ${userId}`);
            }
        }
    }
    res.json({ received: true });
});
// Purchase history
router.get('/history', async (req, res) => {
    try {
        const userId = getUserId(req);
        const payments = await getPaymentsData();
        const userPayments = payments
            .filter(p => p.userId === userId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json(userPayments);
    }
    catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
});
//# sourceMappingURL=credits.js.map