import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { generateImage, ImageModel, MODEL_OPTIONS } from '../services/openai';
import { getUserCredits, useCredits, MODEL_CREDIT_COSTS } from './credits';
import { trackEvent } from './analytics';

const router = Router();

// Get user ID from request
function getUserId(req: any): string {
  return req.headers['x-device-id'] as string || 'anonymous';
}

const generateSchema = z.object({
  prompt: z.string().min(1).max(4000),
  model: z.enum(['dall-e-3', 'dall-e-2', 'gpt-image-1', 'gpt-image-1-mini']).default('dall-e-3'),
  size: z.string().optional(),
  quality: z.string().optional(),
  style: z.enum(['vivid', 'natural']).optional(),
  n: z.number().min(1).max(10).default(1),
});

const batchSchema = z.object({
  prompts: z.array(z.string().min(1)).min(1).max(10),
  model: z.enum(['dall-e-3', 'dall-e-2', 'gpt-image-1', 'gpt-image-1-mini']).default('dall-e-3'),
  size: z.string().optional(),
  quality: z.string().optional(),
});

// Generate single image
router.post('/generate', async (req, res) => {
  try {
    const input = generateSchema.parse(req.body);
    const userId = getUserId(req);
    
    // Check credits
    const cost = (MODEL_CREDIT_COSTS[input.model] || 1) * input.n;
    const credits = await getUserCredits(userId);
    
    if (credits.balance < cost) {
      return res.status(402).json({ 
        error: 'Insufficient credits',
        required: cost,
        balance: credits.balance,
        upgradeUrl: '/credits'
      });
    }
    
    console.log(`🎨 Generating image with ${input.model}: "${input.prompt.slice(0, 50)}..."`);
    
    const images = await generateImage({
      prompt: input.prompt,
      model: input.model,
      size: input.size,
      quality: input.quality,
      style: input.style,
      n: input.n,
    });

    // Save metadata
    const uploadDir = path.join(__dirname, '../../uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const savedImages = await Promise.all(
      images.map(async (img, index) => {
        const id = uuidv4();
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

        await fs.writeFile(
          path.join(uploadDir, `${id}.json`),
          JSON.stringify(metadata, null, 2)
        );

        return metadata;
      })
    );

    // Deduct credits
    await useCredits(userId, cost);
    
    // Track successful generation
    await trackEvent('image_generated', userId, {
      model: input.model,
      count: input.n,
      cost,
      size: input.size,
      quality: input.quality,
    });
    await trackEvent('credits_used', userId, { credits: cost, reason: 'image_generation' });
    
    res.json({ 
      success: true, 
      images: savedImages,
      creditsUsed: cost,
      remainingCredits: credits.balance - cost
    });
  } catch (error) {
    console.error('Generation error:', error);
    // Track failed generation
    await trackEvent('image_failed', getUserId(req), {
      model: req.body.model,
      error: (error as Error).message,
    });
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    } else {
      res.status(500).json({ error: (error as Error).message });
    }
  }
});

// Batch generate
router.post('/batch', async (req, res) => {
  try {
    const input = batchSchema.parse(req.body);
    const userId = getUserId(req);
    
    // Check credits
    const costPerImage = MODEL_CREDIT_COSTS[input.model] || 1;
    const totalCost = costPerImage * input.prompts.length;
    const credits = await getUserCredits(userId);
    
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
        const images = await generateImage({
          prompt,
          model: input.model,
          size: input.size,
          quality: input.quality,
          n: 1,
        });

        const uploadDir = path.join(__dirname, '../../uploads');
        const id = uuidv4();
        const metadata = {
          id,
          url: images[0].url,
          prompt,
          model: input.model,
          size: input.size,
          quality: input.quality,
          createdAt: new Date().toISOString(),
        };

        await fs.writeFile(
          path.join(uploadDir, `${id}.json`),
          JSON.stringify(metadata, null, 2)
        );

        results.push({ success: true, ...metadata });
        creditsUsed += costPerImage;
      } catch (err) {
        results.push({ success: false, prompt, error: (err as Error).message });
      }
    }

    // Deduct credits for successful generations
    if (creditsUsed > 0) {
      await useCredits(userId, creditsUsed);
      await trackEvent('credits_used', userId, { credits: creditsUsed, reason: 'batch_generation' });
    }
    
    // Track successful batch generations
    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      await trackEvent('image_generated', userId, {
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
  } catch (error) {
    console.error('Batch error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    } else {
      res.status(500).json({ error: (error as Error).message });
    }
  }
});

// Get model options
router.get('/models', (_req, res) => {
  res.json(MODEL_OPTIONS);
});

export { router as imageRoutes };
