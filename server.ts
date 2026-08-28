import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import { z } from 'zod';
import { pool, initDatabase, getDbStatus, getMemoryFallbackGuide, getMemoryFallbackAssets } from './server/db.js';
import { assetRepository } from './server/assetRepository.js';
import { checkAssetHealth } from './server/healthCheckService.js';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Explicit JSON content-type middleware for all /api routes
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Health check endpoint (`GET /healthz`)
app.get('/healthz', async (req: Request, res: Response) => {
  const dbConnected = getDbStatus();
  res.json({
    status: 'ok',
    service: 'ajn-liberty-play-api',
    database: dbConnected ? 'connected' : 'memory-fallback',
    timestamp: new Date().toISOString()
  });
});

// Zod schemas for validation
const scheduleQuerySchema = z.object({
  channel_id: z.string().optional(),
});

// API Endpoints: /api/v1/guide (Supports PostgreSQL or resilient memory fallback)
app.get('/api/v1/guide', async (req: Request, res: Response) => {
  try {
    if (!getDbStatus()) {
      return res.json({
        success: true,
        source: 'memory-fallback',
        channels: getMemoryFallbackGuide(),
        serverTime: new Date().toISOString()
      });
    }

    const channelsRes = await pool.query('SELECT * FROM channels ORDER BY id ASC');
    const schedulesRes = await pool.query('SELECT * FROM schedules ORDER BY start_time ASC');
    const sourcesRes = await pool.query('SELECT * FROM sources WHERE is_active = true');

    const channels = channelsRes.rows.map(ch => ({
      ...ch,
      sources: sourcesRes.rows.filter(s => s.channel_id === ch.id),
      schedules: schedulesRes.rows.filter(sch => sch.channel_id === ch.id)
    }));

    return res.json({
      success: true,
      source: 'postgresql',
      channels,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error fetching guide:', err);
    return res.json({
      success: true,
      source: 'memory-fallback',
      channels: getMemoryFallbackGuide(),
      serverTime: new Date().toISOString()
    });
  }
});

// Channels endpoint
app.get('/api/v1/channels', async (req: Request, res: Response) => {
  try {
    if (!getDbStatus()) {
      return res.status(503).json({ success: false, error: 'Database unreachable' });
    }
    const result = await pool.query('SELECT * FROM channels ORDER BY id ASC');
    return res.json({ success: true, channels: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// Schedules endpoint
app.get('/api/v1/schedules', async (req: Request, res: Response) => {
  try {
    const queryResult = scheduleQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({ success: false, error: queryResult.error.format() });
    }

    if (!getDbStatus()) {
      return res.status(503).json({ success: false, error: 'Database unreachable' });
    }

    let query = 'SELECT * FROM schedules';
    let params: any[] = [];
    if (queryResult.data.channel_id) {
      query += ' WHERE channel_id = $1';
      params.push(queryResult.data.channel_id);
    }
    query += ' ORDER BY start_time ASC';
    const result = await pool.query(query, params);
    return res.json({ success: true, schedules: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// Phase 6 Milestone 1: Media Asset Endpoints (Repository-backed)
const createAssetSchema = z.object({
  title: z.string().min(1),
  file_path: z.string(),
  file_size: z.number().optional().default(0),
  duration: z.number().optional().default(0),
  format: z.string().optional().default('hls'),
  codec: z.string().optional().default('h264'),
  bitrate: z.number().optional().default(4000000),
  status: z.string().optional().default('ready'),
  health_score: z.number().optional().default(100),
  checksum: z.string().optional(),
  content_type: z.string().optional(),
  metadata: z.any().optional().default({}),
});

const updateAssetSchema = z.object({
  title: z.string().min(1).optional(),
  file_path: z.string().optional(),
  file_size: z.number().optional(),
  duration: z.number().optional(),
  format: z.string().optional(),
  codec: z.string().optional(),
  bitrate: z.number().optional(),
  status: z.string().optional(),
  health_score: z.number().optional(),
  checksum: z.string().optional(),
  content_type: z.string().optional(),
  metadata: z.any().optional(),
});

const batchAssetSchema = z.object({
  assets: z.array(createAssetSchema),
});

app.get('/api/v1/assets', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!getDbStatus()) {
      return res.json({ success: true, source: 'memory-fallback', assets: getMemoryFallbackAssets().filter(a => !a.deleted_at) });
    }
    const result = await assetRepository.findAll({ page, limit });
    return res.json({ success: true, source: 'postgresql', assets: result.assets, total: result.total, page, limit });
  } catch (err) {
    if (!getDbStatus()) {
      return res.json({ success: true, source: 'memory-fallback', assets: getMemoryFallbackAssets().filter(a => !a.deleted_at) });
    }
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.get('/api/v1/assets/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid asset ID' });
    }
    if (!getDbStatus()) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }
    const asset = await assetRepository.findById(id);
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    return res.json({ success: true, source: 'postgresql', asset });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.post('/api/v1/assets', async (req: Request, res: Response) => {
  try {
    const parseRes = createAssetSchema.safeParse(req.body);
    if (!parseRes.success) {
      return res.status(400).json({ success: false, error: parseRes.error.format() });
    }
    if (!getDbStatus()) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }
    const asset = await assetRepository.create(parseRes.data);
    return res.status(201).json({ success: true, source: 'postgresql', asset });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.patch('/api/v1/assets/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid asset ID' });
    }
    const parseRes = updateAssetSchema.safeParse(req.body);
    if (!parseRes.success) {
      return res.status(400).json({ success: false, error: parseRes.error.format() });
    }
    if (!getDbStatus()) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }
    const asset = await assetRepository.update(id, parseRes.data);
    return res.json({ success: true, source: 'postgresql', asset });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'Asset not found') {
      return res.status(404).json({ success: false, error: msg });
    }
    return res.status(500).json({ success: false, error: msg });
  }
});

app.delete('/api/v1/assets/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid asset ID' });
    }
    if (!getDbStatus()) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }
    await assetRepository.softDelete(id);
    return res.json({ success: true, source: 'postgresql', message: 'Asset soft-deleted successfully' });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('not found')) {
      return res.status(404).json({ success: false, error: msg });
    }
    return res.status(500).json({ success: false, error: msg });
  }
});

app.post('/api/v1/assets/:id/health-check', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid asset ID' });
    }
    if (!getDbStatus()) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }
    const asset = await assetRepository.findById(id);
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    const healthResult = await checkAssetHealth(asset.file_path);
    const updatedAsset = await assetRepository.update(id, {
      health_score: healthResult.score,
      last_checked_at: healthResult.checkedAt,
      content_type: healthResult.contentType,
      status: healthResult.status,
      checksum: healthResult.checksum
    });

    return res.json({ success: true, source: 'postgresql', asset: updatedAsset, health_details: healthResult });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.get('/api/v1/assets/:id/audit', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid asset ID' });
    }
    if (!getDbStatus()) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }
    const auditTrail = await assetRepository.getAuditTrail(id);
    return res.json({ success: true, source: 'postgresql', audit: auditTrail });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.post('/api/v1/assets/batch', async (req: Request, res: Response) => {
  try {
    const parseRes = batchAssetSchema.safeParse(req.body);
    if (!parseRes.success) {
      return res.status(400).json({ success: false, error: parseRes.error.format() });
    }
    if (!getDbStatus()) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }

    const results = [];
    for (const item of parseRes.data.assets) {
      try {
        const created = await assetRepository.create(item);
        results.push({ success: true, asset: created });
      } catch (itemErr) {
        results.push({ success: false, error: (itemErr as Error).message, input: item });
      }
    }

    return res.json({ success: true, source: 'postgresql', results });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});


async function startServer() {
  await initDatabase();

  // Vite middleware for development or static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AJN Liberty Play API Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
