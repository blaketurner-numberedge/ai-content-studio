import OpenAI from 'openai';
import fs from 'fs';

// Demo mode - returns sample images when no API key is configured
export const DEMO_MODE = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'demo';

// Sample demo images (Unsplash images for preview)
const DEMO_IMAGES = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1024&h=1024&fit=crop',
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1024&h=1024&fit=crop',
  'https://images.unsplash.com/photo-1549490349-8643362247b5?w=1024&h=1024&fit=crop',
  'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1024&h=1024&fit=crop',
  'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1024&h=1024&fit=crop',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1024&h=1024&fit=crop',
  'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=1024&h=1024&fit=crop',
  'https://images.unsplash.com/photo-1614851099511-773084f6911d?w=1024&h=1024&fit=crop',
];

export const openai = DEMO_MODE 
  ? null 
  : new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

export type ImageModel = 'dall-e-3' | 'dall-e-2' | 'gpt-image-1' | 'gpt-image-1-mini';

export interface GenerateImageOptions {
  prompt: string;
  model?: ImageModel;
  size?: string;
  quality?: string;
  style?: 'vivid' | 'natural';
  n?: number;
}

export interface GeneratedImage {
  url: string;
  revised_prompt?: string;
  b64_json?: string;
}

export interface VariationOptions {
  imagePath: string;
  n?: number;
  size?: string;
}

export interface EditOptions {
  imagePath: string;
  maskPath?: string;
  prompt: string;
  n?: number;
  size?: string;
}

export async function generateImage(options: GenerateImageOptions): Promise<GeneratedImage[]> {
  const { prompt, model = 'dall-e-3', size, quality, style, n = 1 } = options;

  // Demo mode - return sample images
  if (DEMO_MODE) {
    console.log('🎨 [DEMO MODE] Returning sample images');
    const count = model === 'dall-e-3' ? 1 : Math.min(n, 10);
    return Array.from({ length: count }, (_, i) => ({
      url: DEMO_IMAGES[i % DEMO_IMAGES.length],
      revised_prompt: `[DEMO] ${prompt}`,
    }));
  }

  // Set defaults based on model
  const modelConfig = getModelConfig(model, size, quality);

  const response = await openai!.images.generate({
    model,
    prompt,
    n: model === 'dall-e-3' ? 1 : Math.min(n, 10),
    size: modelConfig.size as any,
    quality: modelConfig.quality as any,
    style: style as any,
    response_format: 'url',
  });

  return (response.data || []).map(img => ({
    url: img.url || '',
    revised_prompt: img.revised_prompt,
  }));
}

export async function createVariations(options: VariationOptions): Promise<GeneratedImage[]> {
  const { n = 1 } = options;

  // Demo mode - return sample images
  if (DEMO_MODE) {
    console.log('🔄 [DEMO MODE] Returning sample variations');
    const count = Math.min(n, 4);
    return Array.from({ length: count }, (_, i) => ({
      url: DEMO_IMAGES[(i + 4) % DEMO_IMAGES.length],
    }));
  }

  const response = await openai!.images.createVariation({
    image: fs.createReadStream(options.imagePath),
    n: Math.min(n, 4),
    size: options.size as any,
    response_format: 'url',
  });

  return (response.data || []).map(img => ({
    url: img.url || '',
  }));
}

export async function createEdit(options: EditOptions): Promise<GeneratedImage[]> {
  const { prompt, n = 1 } = options;

  // Demo mode - return sample images
  if (DEMO_MODE) {
    console.log('✏️ [DEMO MODE] Returning sample edit');
    const count = Math.min(n, 4);
    return Array.from({ length: count }, (_, i) => ({
      url: DEMO_IMAGES[(i + 6) % DEMO_IMAGES.length],
      revised_prompt: `[DEMO EDIT] ${prompt}`,
    }));
  }

  const response = await openai!.images.edit({
    image: fs.createReadStream(options.imagePath),
    mask: options.maskPath ? fs.createReadStream(options.maskPath) : undefined,
    prompt,
    n: Math.min(n, 4),
    size: options.size as any,
    response_format: 'url',
  });

  return (response.data || []).map(img => ({
    url: img.url || '',
    revised_prompt: prompt,
  }));
}

function getModelConfig(model: ImageModel, size?: string, quality?: string) {
  const configs: Record<ImageModel, { size: string; quality: string }> = {
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

export const MODEL_OPTIONS: Record<ImageModel, { sizes: string[]; qualities: string[] }> = {
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
