import pkg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL || 'postgresql://ajn_user:ajn_password@localhost:5432/ajn_liberty_play';

export const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 1500,
});

let isConnected = false;

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  isConnected = false;
});

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
    client.release();
    isConnected = true;
    console.log('PostgreSQL connected successfully at:', res.rows[0].now);
    
    try {
      const tableCheck = await pool.query("SELECT to_regclass('public.channels')");
      if (!tableCheck.rows[0].to_regclass) {
        console.log('Running initial schema migration...');
        const schemaSql = fs.readFileSync(path.join(process.cwd(), 'server', 'schema.sql'), 'utf8');
        await pool.query(schemaSql);
        console.log('Schema migration applied successfully.');
      }
    } catch (migErr) {
      console.warn('Migration auto-apply warning:', migErr);
    }

    return true;
  } catch (err) {
    isConnected = false;
    console.warn('PostgreSQL connection offline. Using resilient in-memory fallback store:', (err as Error).message);
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
