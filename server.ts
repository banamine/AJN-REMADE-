import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import { z } from 'zod';
import { pool, initDatabase, getDbStatus, getMemoryFallbackGuide } from './server/db.js';
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

// Phase 6 Milestone 1: Media Asset Endpoints
const createAssetSchema = z.object({
  title: z.string().min(1),
  file_path: z.string(),
  file_size: z.number().optional().default(0),
  duration: z.number().optional().default(0),
  format: z.string().optional().default('hls'),
  codec: z.string().optional().default('h264'),
  bitrate: z.number().optional().default(4000000),
});

let inMemoryAssets = [
  {
    id: 1,
    title: 'BipBop HD Stream Sample',
    file_path: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
    file_size: 104857600,
    duration: 3600.00,
    format: 'hls',
    codec: 'hevc',
    bitrate: 4500000,
    status: 'ready',
    health_score: 98,
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Global News Bulletin 4K',
    file_path: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
    file_size: 209715200,
    duration: 1800.00,
    format: 'hls',
    codec: 'h264',
    bitrate: 6000000,
    status: 'ready',
    health_score: 95,
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

app.get('/api/v1/assets', async (req: Request, res: Response) => {
  try {
    if (!getDbStatus()) {
      return res.json({ success: true, source: 'memory-fallback', assets: inMemoryAssets.filter(a => !a.deleted_at) });
    }
    const result = await pool.query('SELECT * FROM media_assets WHERE deleted_at IS NULL ORDER BY id DESC');
    return res.json({ success: true, source: 'postgresql', assets: result.rows });
  } catch (err) {
    return res.json({ success: true, source: 'memory-fallback', assets: inMemoryAssets.filter(a => !a.deleted_at) });
  }
});

app.post('/api/v1/assets', async (req: Request, res: Response) => {
  try {
    const parseRes = createAssetSchema.safeParse(req.body);
    if (!parseRes.success) {
      return res.status(400).json({ success: false, error: parseRes.error.format() });
    }
    const { title, file_path, file_size, duration, format, codec, bitrate } = parseRes.data;

    if (!getDbStatus()) {
      const newAsset = {
        id: inMemoryAssets.length + 1,
        title,
        file_path,
        file_size,
        duration,
        format,
        codec,
        bitrate,
        status: 'ready',
        health_score: Math.floor(Math.random() * 10) + 90,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      inMemoryAssets.unshift(newAsset);
      return res.status(201).json({ success: true, source: 'memory-fallback', asset: newAsset });
    }

    const query = `
      INSERT INTO media_assets (title, file_path, file_size, duration, format, codec, bitrate, status, health_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'ready', $8)
      RETURNING *;
    `;
    const healthScore = Math.floor(Math.random() * 10) + 90;
    const result = await pool.query(query, [title, file_path, file_size, duration, format, codec, bitrate, healthScore]);
    return res.status(201).json({ success: true, source: 'postgresql', asset: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.delete('/api/v1/assets/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid asset ID' });
    }

    if (!getDbStatus()) {
      const asset = inMemoryAssets.find(a => a.id === id);
      if (!asset) {
        return res.status(404).json({ success: false, error: 'Asset not found' });
      }
      asset.deleted_at = new Date().toISOString() as any;
      return res.json({ success: true, source: 'memory-fallback', message: 'Asset soft-deleted successfully' });
    }

    const result = await pool.query(
      'UPDATE media_assets SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING *',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Asset not found or already deleted' });
    }
    return res.json({ success: true, source: 'postgresql', message: 'Asset soft-deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.post('/api/v1/assets/:id/health-check', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid asset ID' });
    }

    const newScore = Math.floor(Math.random() * 15) + 85;

    if (!getDbStatus()) {
      const asset = inMemoryAssets.find(a => a.id === id);
      if (!asset) {
        return res.status(404).json({ success: false, error: 'Asset not found' });
      }
      asset.health_score = newScore;
      asset.updated_at = new Date().toISOString();
      return res.json({ success: true, source: 'memory-fallback', asset });
    }

    const result = await pool.query(
      'UPDATE media_assets SET health_score = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND deleted_at IS NULL RETURNING *',
      [newScore, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    return res.json({ success: true, source: 'postgresql', asset: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
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
