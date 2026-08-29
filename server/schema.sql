-- AJN Liberty Play PostgreSQL Schema & Seed (Clean Real Data Contract)

CREATE TABLE IF NOT EXISTS channels (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sources (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'hls',
  url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  media_url TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 3600,
  timezone VARCHAR(50) DEFAULT 'UTC'
);

-- Phase 6 Milestone 1: Media Asset Management & Ingestion Tables
CREATE TABLE IF NOT EXISTS media_assets (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  duration NUMERIC(10,2) DEFAULT 0.00,
  format VARCHAR(50) DEFAULT 'mp4',
  codec VARCHAR(50) DEFAULT 'h264',
  bitrate INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'ready',
  health_score INTEGER DEFAULT 100,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_assets_status ON media_assets(status);
CREATE INDEX IF NOT EXISTS idx_media_assets_deleted_at ON media_assets(deleted_at);
CREATE INDEX IF NOT EXISTS idx_media_assets_health ON media_assets(health_score);

-- Seed Initial Clean Channels if empty
INSERT INTO channels (slug, name, logo_url)
VALUES 
  ('global-news', 'Global News Feed HD', 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=100&h=100&fit=crop'),
  ('tech-live', 'Tech Live Stream', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=100&h=100&fit=crop')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO sources (channel_id, type, url, is_active)
SELECT id, 'hls', 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8', true
FROM channels WHERE slug = 'global-news'
AND NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8');

INSERT INTO sources (channel_id, type, url, is_active)
SELECT id, 'hls', 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8', true
FROM channels WHERE slug = 'tech-live'
AND NOT EXISTS (SELECT 1 FROM sources WHERE url = 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8');

-- Dynamic schedules anchored around NOW()
INSERT INTO schedules (channel_id, title, start_time, end_time, media_url, duration_seconds, timezone)
SELECT id, 'Global News Hour: World Updates & Analysis', NOW() - INTERVAL '45 minutes', NOW() + INTERVAL '15 minutes', 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8', 3600, 'UTC'
FROM channels WHERE slug = 'global-news'
AND NOT EXISTS (SELECT 1 FROM schedules WHERE title LIKE '%Global News Hour%');

INSERT INTO schedules (channel_id, title, start_time, end_time, media_url, duration_seconds, timezone)
SELECT id, 'Global News Special: Economic Outlook', NOW() + INTERVAL '15 minutes', NOW() + INTERVAL '75 minutes', 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8', 3600, 'UTC'
FROM channels WHERE slug = 'global-news'
AND NOT EXISTS (SELECT 1 FROM schedules WHERE title LIKE '%Economic Outlook%');

INSERT INTO schedules (channel_id, title, start_time, end_time, media_url, duration_seconds, timezone)
SELECT id, 'Tech Live: Future of AI & Computing', NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '30 minutes', 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8', 3600, 'UTC'
FROM channels WHERE slug = 'tech-live'
AND NOT EXISTS (SELECT 1 FROM schedules WHERE title LIKE '%Future of AI%');

INSERT INTO schedules (channel_id, title, start_time, end_time, media_url, duration_seconds, timezone)
SELECT id, 'Tech Live: Developer Deep Dive', NOW() + INTERVAL '30 minutes', NOW() + INTERVAL '90 minutes', 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8', 3600, 'UTC'
FROM channels WHERE slug = 'tech-live'
AND NOT EXISTS (SELECT 1 FROM schedules WHERE title LIKE '%Developer Deep Dive%');

INSERT INTO media_assets (title, file_path, file_size, duration, format, codec, bitrate, status, health_score)
VALUES 
  ('NASA Space Archive — Hour 1 (August 28, 2026)', 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8', 104857600, 3600.00, 'hls', 'hevc', 4500000, 'ready', 99),
  ('NASA Space Archive — Hour 2 (August 28, 2026)', 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8', 104857600, 3600.00, 'hls', 'hevc', 4500000, 'ready', 98),
  ('Science Lecture Series — Session 1 (August 28, 2026)', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 45000000, 3720.00, 'mp3', 'mp3', 128000, 'ready', 99),
  ('Science Lecture Series — Session 2 (August 28, 2026)', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 48000000, 4100.00, 'mp3', 'mp3', 128000, 'ready', 97),
  ('History Documentary — Part 1 (August 27, 2026)', 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8', 209715200, 3600.00, 'hls', 'h264', 6000000, 'ready', 95)
ON CONFLICT DO NOTHING;

-- Extend media_assets with checksum + structured metadata
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS checksum VARCHAR(64);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS content_type VARCHAR(100);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS media_asset_audit (
  id BIGSERIAL PRIMARY KEY,
  asset_id INTEGER REFERENCES media_assets(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,           -- 'created', 'updated', 'health_checked', 'soft_deleted'
  changed_fields JSONB DEFAULT '{}'::jsonb,
  previous_values JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_asset_audit_asset_id ON media_asset_audit(asset_id);
CREATE INDEX IF NOT EXISTS idx_media_asset_audit_action ON media_asset_audit(action);

