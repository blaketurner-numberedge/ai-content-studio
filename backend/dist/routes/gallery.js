"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.galleryRoutes = void 0;
const express_1 = require("express");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const jszip_1 = __importDefault(require("jszip"));
const router = (0, express_1.Router)();
exports.galleryRoutes = router;
const uploadDir = path_1.default.join(__dirname, '../../uploads');
// List all gallery items
router.get('/', async (_req, res) => {
    try {
        await promises_1.default.mkdir(uploadDir, { recursive: true });
        const files = await promises_1.default.readdir(uploadDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        const items = await Promise.all(jsonFiles.map(async (file) => {
            try {
                const content = await promises_1.default.readFile(path_1.default.join(uploadDir, file), 'utf-8');
                return JSON.parse(content);
            }
            catch {
                return null;
            }
        }));
        // Sort by createdAt desc, filter out nulls
        const validItems = items
            .filter(Boolean)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json({ items: validItems, total: validItems.length });
    }
    catch (error) {
        console.error('Gallery list error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get single item
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const filePath = path_1.default.join(uploadDir, `${id}.json`);
        const content = await promises_1.default.readFile(filePath, 'utf-8');
        const metadata = JSON.parse(content);
        res.json(metadata);
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Image not found' });
        }
        else {
            res.status(500).json({ error: error.message });
        }
    }
});
// Delete item
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const filePath = path_1.default.join(uploadDir, `${id}.json`);
        await promises_1.default.unlink(filePath);
        res.json({ success: true, message: 'Image deleted' });
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Image not found' });
        }
        else {
            res.status(500).json({ error: error.message });
        }
    }
});
// Export gallery as JSON
router.get('/export/json', async (_req, res) => {
    try {
        const files = await promises_1.default.readdir(uploadDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        const items = await Promise.all(jsonFiles.map(async (file) => {
            try {
                const content = await promises_1.default.readFile(path_1.default.join(uploadDir, file), 'utf-8');
                return JSON.parse(content);
            }
            catch {
                return null;
            }
        }));
        const validItems = items.filter(Boolean);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=gallery-export.json');
        res.json(validItems);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Export all gallery images as ZIP
router.get('/export/zip', async (_req, res) => {
    try {
        const files = await promises_1.default.readdir(uploadDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        const zip = new jszip_1.default();
        const imagesFolder = zip.folder('images');
        const metadata = [];
        await Promise.all(jsonFiles.map(async (file) => {
            try {
                const content = await promises_1.default.readFile(path_1.default.join(uploadDir, file), 'utf-8');
                const item = JSON.parse(content);
                metadata.push(item);
                // Add image to zip if it exists
                const imagePath = path_1.default.join(uploadDir, item.url);
                try {
                    const imageBuffer = await promises_1.default.readFile(imagePath);
                    const ext = path_1.default.extname(item.url) || '.png';
                    imagesFolder?.file(`${item.id}${ext}`, imageBuffer);
                }
                catch {
                    // Image file missing, skip
                }
            }
            catch {
                // Invalid JSON, skip
            }
        }));
        // Add metadata JSON
        zip.file('metadata.json', JSON.stringify(metadata, null, 2));
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=gallery-export-${Date.now()}.zip`);
        res.send(zipBuffer);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
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
        const zip = new jszip_1.default();
        const imagesFolder = zip.folder('images');
        const metadata = [];
        await Promise.all(ids.map(async (id) => {
            try {
                const content = await promises_1.default.readFile(path_1.default.join(uploadDir, `${id}.json`), 'utf-8');
                const item = JSON.parse(content);
                metadata.push(item);
                // Add image to zip if it exists
                const imagePath = path_1.default.join(uploadDir, item.url);
                try {
                    const imageBuffer = await promises_1.default.readFile(imagePath);
                    const ext = path_1.default.extname(item.url) || '.png';
                    imagesFolder?.file(`${item.id}${ext}`, imageBuffer);
                }
                catch {
                    // Image file missing, skip
                }
            }
            catch {
                // Invalid or missing file, skip
            }
        }));
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
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
        const results = await Promise.allSettled(ids.map(async (id) => {
            const filePath = path_1.default.join(uploadDir, `${id}.json`);
            await promises_1.default.unlink(filePath);
            return id;
        }));
        const deleted = results
            .filter((r) => r.status === 'fulfilled')
            .map(r => r.value);
        const failed = results
            .filter((r) => r.status === 'rejected')
            .length;
        res.json({
            success: true,
            deleted: deleted.length,
            failed,
            ids: deleted
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
//# sourceMappingURL=gallery.js.map