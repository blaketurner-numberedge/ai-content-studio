"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_OPTIONS = exports.openai = void 0;
exports.generateImage = generateImage;
const openai_1 = __importDefault(require("openai"));
if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
}
exports.openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
async function generateImage(options) {
    const { prompt, model = 'dall-e-3', size, quality, style, n = 1 } = options;
    // Set defaults based on model
    const modelConfig = getModelConfig(model, size, quality);
    const response = await exports.openai.images.generate({
        model,
        prompt,
        n: model === 'dall-e-3' ? 1 : Math.min(n, 10),
        size: modelConfig.size,
        quality: modelConfig.quality,
        style: style,
        response_format: 'url',
    });
    return (response.data || []).map(img => ({
        url: img.url || '',
        revised_prompt: img.revised_prompt,
    }));
}
function getModelConfig(model, size, quality) {
    const configs = {
        'dall-e-3': {
            size: size || '1024x1024',
            quality: quality || 'standard',
        },
        'dall-e-2': {
            size: size || '1024x1024',
            quality: 'standard',
        },
        'gpt-image-1': {
            size: size || '1024x1024',
            quality: quality || 'high',
        },
        'gpt-image-1-mini': {
            size: size || '1024x1024',
            quality: quality || 'high',
        },
    };
    return configs[model];
}
exports.MODEL_OPTIONS = {
    'dall-e-3': {
        sizes: ['1024x1024', '1792x1024', '1024x1792'],
        qualities: ['standard', 'hd'],
    },
    'dall-e-2': {
        sizes: ['256x256', '512x512', '1024x1024'],
        qualities: ['standard'],
    },
    'gpt-image-1': {
        sizes: ['1024x1024', '1536x1024', '1024x1536'],
        qualities: ['low', 'medium', 'high', 'auto'],
    },
    'gpt-image-1-mini': {
        sizes: ['1024x1024'],
        qualities: ['low', 'medium', 'high', 'auto'],
    },
};
//# sourceMappingURL=openai.js.map