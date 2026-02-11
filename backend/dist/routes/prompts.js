"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptRoutes = void 0;
const express_1 = require("express");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
exports.promptRoutes = router;
const promptsFile = path_1.default.join(__dirname, '../../uploads/prompts.json');
// Default prompt templates
const defaultPrompts = [
    {
        id: 'template-1',
        name: 'Product Photography',
        prompt: 'Professional product photography of {product}, studio lighting, clean white background, high detail, 8k quality',
        category: 'commercial',
        tags: ['product', 'commercial', 'studio'],
    },
    {
        id: 'template-2',
        name: 'Portrait',
        prompt: 'Professional portrait of {subject}, soft natural lighting, blurred background, photorealistic, high quality',
        category: 'portrait',
        tags: ['portrait', 'people', 'photography'],
    },
    {
        id: 'template-3',
        name: 'Landscape',
        prompt: 'Breathtaking landscape of {scene}, golden hour lighting, dramatic sky, cinematic composition, 8k resolution',
        category: 'nature',
        tags: ['landscape', 'nature', 'scenic'],
    },
    {
        id: 'template-4',
        name: 'Abstract Art',
        prompt: 'Abstract digital art featuring {theme}, vibrant colors, geometric shapes, modern aesthetic, high detail',
        category: 'art',
        tags: ['abstract', 'art', 'digital'],
    },
    {
        id: 'template-5',
        name: 'Character Design',
        prompt: 'Character design of {character}, concept art style, detailed illustration, professional quality, fantasy theme',
        category: 'concept',
        tags: ['character', 'concept art', 'illustration'],
    },
];
async function loadPrompts() {
    try {
        const content = await promises_1.default.readFile(promptsFile, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        // Initialize with defaults
        await promises_1.default.mkdir(path_1.default.dirname(promptsFile), { recursive: true });
        await promises_1.default.writeFile(promptsFile, JSON.stringify(defaultPrompts, null, 2));
        return defaultPrompts;
    }
}
async function savePrompts(prompts) {
    await promises_1.default.writeFile(promptsFile, JSON.stringify(prompts, null, 2));
}
// List all prompts
router.get('/', async (_req, res) => {
    try {
        const prompts = await loadPrompts();
        res.json({ prompts });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Add new prompt
const promptSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    prompt: zod_1.z.string().min(1),
    category: zod_1.z.string().default('custom'),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
});
router.post('/', async (req, res) => {
    try {
        const input = promptSchema.parse(req.body);
        const prompts = await loadPrompts();
        const newPrompt = {
            id: (0, uuid_1.v4)(),
            ...input,
            createdAt: new Date().toISOString(),
        };
        prompts.push(newPrompt);
        await savePrompts(prompts);
        res.status(201).json({ success: true, prompt: newPrompt });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        else {
            res.status(500).json({ error: error.message });
        }
    }
});
// Delete prompt
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const prompts = await loadPrompts();
        const filtered = prompts.filter((p) => p.id !== id);
        await savePrompts(filtered);
        res.json({ success: true, message: 'Prompt deleted' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
//# sourceMappingURL=prompts.js.map