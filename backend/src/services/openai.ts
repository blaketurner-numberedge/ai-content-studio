import OpenAI from 'openai';
import fs from 'fs';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

  // Set defaults based on model
  const modelConfig = getModelConfig(model, size, quality);

  const response = await openai.images.generate({
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
  const { imagePath, n = 1, size = '1024x1024' } = options;

  const response = await openai.images.createVariation({
    image: fs.createReadStream(imagePath),
    n: Math.min(n, 4),
    size: size as any,
    response_format: 'url',
  });

  return (response.data || []).map(img => ({
    url: img.url || '',
  }));
}

export async function createEdit(options: EditOptions): Promise<GeneratedImage[]> {
  const { imagePath, maskPath, prompt, n = 1, size = '1024x1024' } = options;

  const response = await openai.images.edit({
    image: fs.createReadStream(imagePath),
    mask: maskPath ? fs.createReadStream(maskPath) : undefined,
    prompt,
    n: Math.min(n, 4),
    size: size as any,
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
