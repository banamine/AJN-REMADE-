import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';

const { Pool } = pkg;

let activePool: any;
let pgliteInstance: PGlite | null = null;
let isConnected = false;

if (process.env.DATABASE_URL) {
  const connectionString = process.env.DATABASE_URL;
  activePool = new Pool({
    connectionString,
    connectionTimeoutMillis: 1500,
  });
  activePool.on('error', (err: any) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    isConnected = false;
  });
} else {
  pgliteInstance = new PGlite('./pgdata');
  activePool = {
    query: async (text: string, params?: any[]) => {
      return await pgliteInstance!.query(text, params);
    },
    exec: async (sql: string) => {
      return await pgliteInstance!.exec(sql);
    },
    connect: async () => {
      return {
        query: async (text: string, params?: any[]) => await pgliteInstance!.query(text, params),
        release: () => {}
      };
    }
  };
}

export const pool = activePool;

// Memory fallback store for resilient zero-config booting
const memoryFallbackChannels = [
  {
    id: 1,
    slug: 'global-news',
    name: 'Global News Feed HD',
    logo_url: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=100&h=100&fit=crop',
    sources: [
      { id: 1, channel_id: 1, type: 'hls', url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8', is_active: true }
    ],
    schedules: [
      {
        id: 101,
        channel_id: 1,
        title: 'Global News Hour: World Updates & Analysis',
        start_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        media_url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
        duration_seconds: 3600,
        timezone: 'UTC'
      },
      {
        id: 102,
        channel_id: 1,
        title: 'Global News Special: Economic Outlook',
        start_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
        media_url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
        duration_seconds: 3600,
        timezone: 'UTC'
      }
    ]
  },
  {
    id: 2,
    slug: 'tech-live',
    name: 'Tech Live Stream',
    logo_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=100&h=100&fit=crop',
    sources: [
      { id: 2, channel_id: 2, type: 'hls', url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8', is_active: true }
    ],
    schedules: [
      {
        id: 201,
        channel_id: 2,
        title: 'Tech Live: Future of AI & Computing',
        start_time: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        media_url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
        duration_seconds: 3600,
        timezone: 'UTC'
      },
      {
        id: 202,
        channel_id: 2,
        title: 'Tech Live: Developer Deep Dive',
        start_time: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 105 * 60 * 1000).toISOString(),
        media_url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
        duration_seconds: 3600,
        timezone: 'UTC'
      }
    ]
  }
];

export async function initDatabase(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    if (client.release) client.release();
    isConnected = true;
    console.log('Database connected successfully at:', res.rows[0].now);
    
    try {
      console.log('Running schema migration (idempotent)...');
      const schemaSql = fs.readFileSync(path.join(process.cwd(), 'server', 'schema.sql'), 'utf8');
      if (pgliteInstance) {
        await pgliteInstance.exec(schemaSql);
      } else {
        await pool.query(schemaSql);
      }
      console.log('Schema migration applied successfully.');
    } catch (migErr) {
      console.warn('Migration auto-apply warning:', migErr);
    }

    return true;
  } catch (err) {
    isConnected = false;
    console.warn('Database connection offline. Using resilient in-memory fallback store:', (err as Error).message);
    return false;
  }
}

export function getDbStatus() {
  return isConnected;
}

export function getMemoryFallbackGuide() {
  return memoryFallbackChannels;
}

export const memoryFallbackAssets = [
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

export function getMemoryFallbackAssets() {
  return memoryFallbackAssets;
}

export function addMemoryFallbackAsset(input: any) {
  const maxId = memoryFallbackAssets.reduce((max, a) => (a.id > max ? a.id : max), 0);
  const newId = maxId + 1;
  const now = new Date().toISOString();
  const newAsset = {
    id: newId,
    title: input.title,
    file_path: input.file_path,
    file_size: input.file_size !== undefined ? input.file_size : 0,
    duration: input.duration !== undefined ? input.duration : 0,
    format: input.format || 'hls',
    codec: input.codec || 'h264',
    bitrate: input.bitrate !== undefined ? input.bitrate : 4000000,
    status: input.status || 'ready',
    health_score: input.health_score !== undefined ? input.health_score : 100,
    checksum: input.checksum || null,
    content_type: input.content_type || null,
    metadata: input.metadata || {},
    deleted_at: null,
    created_at: now,
    updated_at: now
  };
  memoryFallbackAssets.push(newAsset);
  return newAsset;
}

export function updateMemoryFallbackAsset(id: number, updates: any) {
  const asset = memoryFallbackAssets.find(a => a.id === id && !a.deleted_at);
  if (!asset) {
    throw new Error('Asset not found');
  }
  Object.assign(asset, updates, { updated_at: new Date().toISOString() });
  return asset;
}

