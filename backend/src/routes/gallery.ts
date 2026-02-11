import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';

const router = Router();
const uploadDir = path.join(__dirname, '../../uploads');

// List all gallery items
router.get('/', async (_req, res) => {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    const files = await fs.readdir(uploadDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const items = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const content = await fs.readFile(path.join(uploadDir, file), 'utf-8');
          return JSON.parse(content);
        } catch {
          return null;
        }
      })
    );

    // Sort by createdAt desc, filter out nulls
    const validItems = items
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ items: validItems, total: validItems.length });
  } catch (error) {
    console.error('Gallery list error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get single item
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(uploadDir, `${id}.json`);
    
    const content = await fs.readFile(filePath, 'utf-8');
    const metadata = JSON.parse(content);
    
    res.json(metadata);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      res.status(404).json({ error: 'Image not found' });
    } else {
      res.status(500).json({ error: (error as Error).message });
    }
  }
});

// Delete item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(uploadDir, `${id}.json`);
    
    await fs.unlink(filePath);
    res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      res.status(404).json({ error: 'Image not found' });
    } else {
      res.status(500).json({ error: (error as Error).message });
    }
  }
});

// Export gallery as JSON
router.get('/export/json', async (_req, res) => {
  try {
    const files = await fs.readdir(uploadDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const items = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const content = await fs.readFile(path.join(uploadDir, file), 'utf-8');
          return JSON.parse(content);
        } catch {
          return null;
        }
      })
    );

    const validItems = items.filter(Boolean);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=gallery-export.json');
    res.json(validItems);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Export all gallery images as ZIP
router.get('/export/zip', async (_req, res) => {
  try {
    const files = await fs.readdir(uploadDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const zip = new JSZip();
    const imagesFolder = zip.folder('images');
    const metadata: any[] = [];

    await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const content = await fs.readFile(path.join(uploadDir, file), 'utf-8');
          const item = JSON.parse(content);
          metadata.push(item);

          // Add image to zip if it exists
          const imagePath = path.join(uploadDir, item.url);
          try {
            const imageBuffer = await fs.readFile(imagePath);
            const ext = path.extname(item.url) || '.png';
            imagesFolder?.file(`${item.id}${ext}`, imageBuffer);
          } catch {
            // Image file missing, skip
          }
        } catch {
          // Invalid JSON, skip
        }
      })
    );

    // Add metadata JSON
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=gallery-export-${Date.now()}.zip`);
    res.send(zipBuffer);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Export selected images as ZIP
router.post('/export/zip', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'No image IDs provided' });
      return;
    }

    const zip = new JSZip();
    const imagesFolder = zip.folder('images');
    const metadata: any[] = [];

    await Promise.all(
      ids.map(async (id: string) => {
        try {
          const content = await fs.readFile(path.join(uploadDir, `${id}.json`), 'utf-8');
          const item = JSON.parse(content);
          metadata.push(item);

          // Add image to zip if it exists
          const imagePath = path.join(uploadDir, item.url);
          try {
            const imageBuffer = await fs.readFile(imagePath);
            const ext = path.extname(item.url) || '.png';
            imagesFolder?.file(`${item.id}${ext}`, imageBuffer);
          } catch {
            // Image file missing, skip
          }
        } catch {
          // Invalid or missing file, skip
        }
      })
    );

    if (metadata.length === 0) {
      res.status(404).json({ error: 'No valid images found' });
      return;
    }

    // Add metadata JSON
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=gallery-export-${metadata.length}-images.zip`);
    res.send(zipBuffer);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Batch delete images
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'No image IDs provided' });
      return;
    }

    const results = await Promise.allSettled(
      ids.map(async (id: string) => {
        const filePath = path.join(uploadDir, `${id}.json`);
        await fs.unlink(filePath);
        return id;
      })
    );

    const deleted = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map(r => r.value);
    
    const failed = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .length;

    res.json({ 
      success: true, 
      deleted: deleted.length, 
      failed,
      ids: deleted
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export { router as galleryRoutes };
