"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const openai_1 = require("../services/openai");
const credits_1 = require("./credits");
const analytics_1 = require("./analytics");
const axios_1 = __importDefault(require("axios"));
const router = (0, express_1.Router)();
exports.imageRoutes = router;
// Get user ID from request
function getUserId(req) {
    return req.headers['x-device-id'] || 'anonymous';
}
const generateSchema = zod_1.z.object({
    prompt: zod_1.z.string().min(1).max(4000),
    model: zod_1.z.enum(['dall-e-3', 'dall-e-2', 'gpt-image-1', 'gpt-image-1-mini']).default('dall-e-3'),
    size: zod_1.z.string().optional(),
    quality: zod_1.z.string().optional(),
    style: zod_1.z.enum(['vivid', 'natural']).optional(),
    n: zod_1.z.number().min(1).max(10).default(1),
});
const batchSchema = zod_1.z.object({
    prompts: zod_1.z.array(zod_1.z.string().min(1)).min(1).max(10),
    model: zod_1.z.enum(['dall-e-3', 'dall-e-2', 'gpt-image-1', 'gpt-image-1-mini']).default('dall-e-3'),
    size: zod_1.z.string().optional(),
    quality: zod_1.z.string().optional(),
});
// Generate single image
router.post('/generate', async (req, res) => {
    try {
        const input = generateSchema.parse(req.body);
        const userId = getUserId(req);
        // Check credits
        const cost = (credits_1.MODEL_CREDIT_COSTS[input.model] || 1) * input.n;
        const credits = await (0, credits_1.getUserCredits)(userId);
        if (credits.balance < cost) {
            return res.status(402).json({
                error: 'Insufficient credits',
                required: cost,
                balance: credits.balance,
                upgradeUrl: '/credits'
            });
        }
        console.log(`🎨 Generating image with ${input.model}: "${input.prompt.slice(0, 50)}..."`);
        const images = await (0, openai_1.generateImage)({
            prompt: input.prompt,
            model: input.model,
            size: input.size,
            quality: input.quality,
            style: input.style,
            n: input.n,
        });
        // Save metadata
        const uploadDir = path_1.default.join(__dirname, '../../uploads');
        await promises_1.default.mkdir(uploadDir, { recursive: true });
        const savedImages = await Promise.all(images.map(async (img, index) => {
            const id = (0, uuid_1.v4)();
            const metadata = {
                id,
                url: img.url,
                prompt: input.prompt,
                model: input.model,
                size: input.size,
                quality: input.quality,
                style: input.style,
                revised_prompt: img.revised_prompt,
                createdAt: new Date().toISOString(),
            };
            await promises_1.default.writeFile(path_1.default.join(uploadDir, `${id}.json`), JSON.stringify(metadata, null, 2));
            return metadata;
        }));
        // Deduct credits
        await (0, credits_1.useCredits)(userId, cost);
        // Track successful generation
        await (0, analytics_1.trackEvent)('image_generated', userId, {
            model: input.model,
            count: input.n,
            cost,
            size: input.size,
            quality: input.quality,
        });
        await (0, analytics_1.trackEvent)('credits_used', userId, { credits: cost, reason: 'image_generation' });
        res.json({
            success: true,
            images: savedImages,
            creditsUsed: cost,
            remainingCredits: credits.balance - cost
        });
    }
    catch (error) {
        console.error('Generation error:', error);
        // Track failed generation
        await (0, analytics_1.trackEvent)('image_failed', getUserId(req), {
            model: req.body.model,
            error: error.message,
        });
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        else {
            res.status(500).json({ error: error.message });
        }
    }
});
// Batch generate
router.post('/batch', async (req, res) => {
    try {
        const input = batchSchema.parse(req.body);
        const userId = getUserId(req);
        // Check credits
        const costPerImage = credits_1.MODEL_CREDIT_COSTS[input.model] || 1;
        const totalCost = costPerImage * input.prompts.length;
        const credits = await (0, credits_1.getUserCredits)(userId);
        if (credits.balance < totalCost) {
            return res.status(402).json({
                error: 'Insufficient credits',
                required: totalCost,
                balance: credits.balance,
                upgradeUrl: '/credits'
            });
        }
        const results = [];
        let creditsUsed = 0;
        console.log(`🔄 Batch generating ${input.prompts.length} images...`);
        for (const prompt of input.prompts) {
            try {
                const images = await (0, openai_1.generateImage)({
                    prompt,
                    model: input.model,
                    size: input.size,
                    quality: input.quality,
                    n: 1,
                });
                const uploadDir = path_1.default.join(__dirname, '../../uploads');
                const id = (0, uuid_1.v4)();
                const metadata = {
                    id,
                    url: images[0].url,
                    prompt,
                    model: input.model,
                    size: input.size,
                    quality: input.quality,
                    createdAt: new Date().toISOString(),
                };
                await promises_1.default.writeFile(path_1.default.join(uploadDir, `${id}.json`), JSON.stringify(metadata, null, 2));
                results.push({ success: true, ...metadata });
                creditsUsed += costPerImage;
            }
            catch (err) {
                results.push({ success: false, prompt, error: err.message });
            }
        }
        // Deduct credits for successful generations
        if (creditsUsed > 0) {
            await (0, credits_1.useCredits)(userId, creditsUsed);
            await (0, analytics_1.trackEvent)('credits_used', userId, { credits: creditsUsed, reason: 'batch_generation' });
        }
        // Track successful batch generations
        const successCount = results.filter(r => r.success).length;
        if (successCount > 0) {
            await (0, analytics_1.trackEvent)('image_generated', userId, {
                model: input.model,
                count: successCount,
                cost: creditsUsed,
                batch: true,
            });
        }
        res.json({
            success: true,
            results,
            creditsUsed,
            remainingCredits: credits.balance - creditsUsed
        });
    }
    catch (error) {
        console.error('Batch error:', error);
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        else {
            res.status(500).json({ error: error.message });
        }
    }
});
// Get model options
router.get('/models', (_req, res) => {
    res.json(openai_1.MODEL_OPTIONS);
});
// Variation schema
const variationSchema = zod_1.z.object({
    n: zod_1.z.number().min(1).max(4).default(1),
    size: zod_1.z.enum(['256x256', '512x512', '1024x1024']).default('1024x1024'),
});
// Create variations of an existing image
router.post('/:id/variations', async (req, res) => {
    try {
        const { id } = req.params;
        const input = variationSchema.parse(req.body);
        const userId = getUserId(req);
        // Check credits (variations cost same as dalle-2)
        const cost = (credits_1.MODEL_CREDIT_COSTS['dall-e-2'] || 1) * input.n;
        const credits = await (0, credits_1.getUserCredits)(userId);
        if (credits.balance < cost) {
            return res.status(402).json({
                error: 'Insufficient credits',
                required: cost,
                balance: credits.balance,
                upgradeUrl: '/credits'
            });
        }
        // Get the original image metadata
        const uploadDir = path_1.default.join(__dirname, '../../uploads');
        const metadataPath = path_1.default.join(uploadDir, `${id}.json`);
        if (!fs_1.default.existsSync(metadataPath)) {
            return res.status(404).json({ error: 'Image not found' });
        }
        const metadata = JSON.parse(await promises_1.default.readFile(metadataPath, 'utf-8'));
        // Download the original image
        const imageResponse = await axios_1.default.get(metadata.url, { responseType: 'arraybuffer' });
        const tempImagePath = path_1.default.join(uploadDir, `temp_${id}.png`);
        await promises_1.default.writeFile(tempImagePath, Buffer.from(imageResponse.data));
        console.log(`🎨 Creating ${input.n} variation(s) of image ${id}`);
        try {
            const variations = await (0, openai_1.createVariations)({
                imagePath: tempImagePath,
                n: input.n,
                size: input.size,
            });
            // Save variation metadata
            const savedVariations = await Promise.all(variations.map(async (img) => {
                const newId = (0, uuid_1.v4)();
                const newMetadata = {
                    id: newId,
                    url: img.url,
                    prompt: `Variation of: ${metadata.prompt}`,
                    originalId: id,
                    model: 'dall-e-2',
                    size: input.size,
                    createdAt: new Date().toISOString(),
                };
                await promises_1.default.writeFile(path_1.default.join(uploadDir, `${newId}.json`), JSON.stringify(newMetadata, null, 2));
                return newMetadata;
            }));
            // Deduct credits
            await (0, credits_1.useCredits)(userId, cost);
            await (0, analytics_1.trackEvent)('credits_used', userId, { credits: cost, reason: 'image_variation' });
            await (0, analytics_1.trackEvent)('image_variation', userId, {
                originalId: id,
                count: input.n,
                cost
            });
            res.json({
                success: true,
                variations: savedVariations,
                creditsUsed: cost,
                remainingCredits: credits.balance - cost,
            });
        }
        finally {
            // Cleanup temp file
            if (fs_1.default.existsSync(tempImagePath)) {
                await promises_1.default.unlink(tempImagePath).catch(() => { });
            }
        }
    }
    catch (error) {
        console.error('Variation error:', error);
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        else {
            res.status(500).json({ error: error.message });
        }
    }
});
// Edit schema
const editSchema = zod_1.z.object({
    prompt: zod_1.z.string().min(1).max(4000),
    n: zod_1.z.number().min(1).max(4).default(1),
    size: zod_1.z.enum(['256x256', '512x512', '1024x1024']).default('1024x1024'),
});
// Edit an existing image with a prompt
router.post('/:id/edit', async (req, res) => {
    try {
        const { id } = req.params;
        const input = editSchema.parse(req.body);
        const userId = getUserId(req);
        // Check credits (edits cost same as dalle-2)
        const cost = (credits_1.MODEL_CREDIT_COSTS['dall-e-2'] || 1) * input.n;
        const credits = await (0, credits_1.getUserCredits)(userId);
        if (credits.balance < cost) {
            return res.status(402).json({
                error: 'Insufficient credits',
                required: cost,
                balance: credits.balance,
                upgradeUrl: '/credits'
            });
        }
        // Get the original image metadata
        const uploadDir = path_1.default.join(__dirname, '../../uploads');
        const metadataPath = path_1.default.join(uploadDir, `${id}.json`);
        if (!fs_1.default.existsSync(metadataPath)) {
            return res.status(404).json({ error: 'Image not found' });
        }
        const metadata = JSON.parse(await promises_1.default.readFile(metadataPath, 'utf-8'));
        // Download the original image
        const imageResponse = await axios_1.default.get(metadata.url, { responseType: 'arraybuffer' });
        const tempImagePath = path_1.default.join(uploadDir, `temp_${id}.png`);
        await promises_1.default.writeFile(tempImagePath, Buffer.from(imageResponse.data));
        console.log(`✏️ Editing image ${id} with prompt: "${input.prompt.slice(0, 50)}..."`);
        try {
            const edits = await (0, openai_1.createEdit)({
                imagePath: tempImagePath,
                prompt: input.prompt,
                n: input.n,
                size: input.size,
            });
            // Save edit metadata
            const savedEdits = await Promise.all(edits.map(async (img) => {
                const newId = (0, uuid_1.v4)();
                const newMetadata = {
                    id: newId,
                    url: img.url,
                    prompt: input.prompt,
                    originalPrompt: metadata.prompt,
                    originalId: id,
                    model: 'dall-e-2',
                    size: input.size,
                    createdAt: new Date().toISOString(),
                };
                await promises_1.default.writeFile(path_1.default.join(uploadDir, `${newId}.json`), JSON.stringify(newMetadata, null, 2));
                return newMetadata;
            }));
            // Deduct credits
            await (0, credits_1.useCredits)(userId, cost);
            await (0, analytics_1.trackEvent)('credits_used', userId, { credits: cost, reason: 'image_edit' });
            await (0, analytics_1.trackEvent)('image_edit', userId, {
                originalId: id,
                count: input.n,
                cost
            });
            res.json({
                success: true,
                edits: savedEdits,
                creditsUsed: cost,
                remainingCredits: credits.balance - cost,
            });
        }
        finally {
            // Cleanup temp file
            if (fs_1.default.existsSync(tempImagePath)) {
                await promises_1.default.unlink(tempImagePath).catch(() => { });
            }
        }
    }
    catch (error) {
        console.error('Edit error:', error);
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        else {
            res.status(500).json({ error: error.message });
        }
    }
});
//# sourceMappingURL=images.js.map