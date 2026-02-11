import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { generateImage, createVariations, createEdit, ImageModel, MODEL_OPTIONS } from '../services/openai';
import { getUserCredits, useCredits, MODEL_CREDIT_COSTS } from './credits';
import { trackEvent } from './analytics';
import axios from 'axios';

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

// Variation schema
const variationSchema = z.object({
  n: z.number().min(1).max(4).default(1),
  size: z.enum(['256x256', '512x512', '1024x1024']).default('1024x1024'),
});

// Create variations of an existing image
router.post('/:id/variations', async (req, res) => {
  try {
    const { id } = req.params;
    const input = variationSchema.parse(req.body);
    const userId = getUserId(req);
    
    // Check credits (variations cost same as dalle-2)
    const cost = (MODEL_CREDIT_COSTS['dall-e-2'] || 1) * input.n;
    const credits = await getUserCredits(userId);
    
    if (credits.balance < cost) {
      return res.status(402).json({ 
        error: 'Insufficient credits',
        required: cost,
        balance: credits.balance,
        upgradeUrl: '/credits'
      });
    }
    
    // Get the original image metadata
    const uploadDir = path.join(__dirname, '../../uploads');
    const metadataPath = path.join(uploadDir, `${id}.json`);
    
    if (!fsSync.existsSync(metadataPath)) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    
    // Download the original image
    const imageResponse = await axios.get(metadata.url, { responseType: 'arraybuffer' });
    const tempImagePath = path.join(uploadDir, `temp_${id}.png`);
    await fs.writeFile(tempImagePath, Buffer.from(imageResponse.data));
    
    console.log(`🎨 Creating ${input.n} variation(s) of image ${id}`);
    
    try {
      const variations = await createVariations({
        imagePath: tempImagePath,
        n: input.n,
        size: input.size,
      });
      
      // Save variation metadata
      const savedVariations = await Promise.all(
        variations.map(async (img) => {
          const newId = uuidv4();
          const newMetadata = {
            id: newId,
            url: img.url,
            prompt: `Variation of: ${metadata.prompt}`,
            originalId: id,
            model: 'dall-e-2',
            size: input.size,
            createdAt: new Date().toISOString(),
          };
          
          await fs.writeFile(
            path.join(uploadDir, `${newId}.json`),
            JSON.stringify(newMetadata, null, 2)
          );
          
          return newMetadata;
        })
      );
      
      // Deduct credits
      await useCredits(userId, cost);
      await trackEvent('credits_used', userId, { credits: cost, reason: 'image_variation' });
      await trackEvent('image_variation', userId, { 
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
    } finally {
      // Cleanup temp file
      if (fsSync.existsSync(tempImagePath)) {
        await fs.unlink(tempImagePath).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Variation error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    } else {
      res.status(500).json({ error: (error as Error).message });
    }
  }
});

// Edit schema
const editSchema = z.object({
  prompt: z.string().min(1).max(4000),
  n: z.number().min(1).max(4).default(1),
  size: z.enum(['256x256', '512x512', '1024x1024']).default('1024x1024'),
});

// Edit an existing image with a prompt
router.post('/:id/edit', async (req, res) => {
  try {
    const { id } = req.params;
    const input = editSchema.parse(req.body);
    const userId = getUserId(req);
    
    // Check credits (edits cost same as dalle-2)
    const cost = (MODEL_CREDIT_COSTS['dall-e-2'] || 1) * input.n;
    const credits = await getUserCredits(userId);
    
    if (credits.balance < cost) {
      return res.status(402).json({ 
        error: 'Insufficient credits',
        required: cost,
        balance: credits.balance,
        upgradeUrl: '/credits'
      });
    }
    
    // Get the original image metadata
    const uploadDir = path.join(__dirname, '../../uploads');
    const metadataPath = path.join(uploadDir, `${id}.json`);
    
    if (!fsSync.existsSync(metadataPath)) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    
    // Download the original image
    const imageResponse = await axios.get(metadata.url, { responseType: 'arraybuffer' });
    const tempImagePath = path.join(uploadDir, `temp_${id}.png`);
    await fs.writeFile(tempImagePath, Buffer.from(imageResponse.data));
    
    console.log(`✏️ Editing image ${id} with prompt: "${input.prompt.slice(0, 50)}..."`);
    
    try {
      const edits = await createEdit({
        imagePath: tempImagePath,
        prompt: input.prompt,
        n: input.n,
        size: input.size,
      });
      
      // Save edit metadata
      const savedEdits = await Promise.all(
        edits.map(async (img) => {
          const newId = uuidv4();
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
          
          await fs.writeFile(
            path.join(uploadDir, `${newId}.json`),
            JSON.stringify(newMetadata, null, 2)
          );
          
          return newMetadata;
        })
      );
      
      // Deduct credits
      await useCredits(userId, cost);
      await trackEvent('credits_used', userId, { credits: cost, reason: 'image_edit' });
      await trackEvent('image_edit', userId, { 
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
    } finally {
      // Cleanup temp file
      if (fsSync.existsSync(tempImagePath)) {
        await fs.unlink(tempImagePath).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Edit error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    } else {
      res.status(500).json({ error: (error as Error).message });
    }
  }
});

export { router as imageRoutes };
