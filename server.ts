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
