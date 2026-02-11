import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const promptsFile = path.join(__dirname, '../../uploads/prompts.json');

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
    const content = await fs.readFile(promptsFile, 'utf-8');
    return JSON.parse(content);
  } catch {
    // Initialize with defaults
    await fs.mkdir(path.dirname(promptsFile), { recursive: true });
    await fs.writeFile(promptsFile, JSON.stringify(defaultPrompts, null, 2));
    return defaultPrompts;
  }
}

async function savePrompts(prompts: any[]) {
  await fs.writeFile(promptsFile, JSON.stringify(prompts, null, 2));
}

// List all prompts
router.get('/', async (_req, res) => {
  try {
    const prompts = await loadPrompts();
    res.json({ prompts });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Add new prompt
const promptSchema = z.object({
  name: z.string().min(1),
  prompt: z.string().min(1),
  category: z.string().default('custom'),
  tags: z.array(z.string()).default([]),
});

router.post('/', async (req, res) => {
  try {
    const input = promptSchema.parse(req.body);
    const prompts = await loadPrompts();
    
    const newPrompt = {
      id: uuidv4(),
      ...input,
      createdAt: new Date().toISOString(),
    };
    
    prompts.push(newPrompt);
    await savePrompts(prompts);
    
    res.status(201).json({ success: true, prompt: newPrompt });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    } else {
      res.status(500).json({ error: (error as Error).message });
    }
  }
});

// Delete prompt
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const prompts = await loadPrompts();
    
    const filtered = prompts.filter((p: any) => p.id !== id);
    await savePrompts(filtered);
    
    res.json({ success: true, message: 'Prompt deleted' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export { router as promptRoutes };
