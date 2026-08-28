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
