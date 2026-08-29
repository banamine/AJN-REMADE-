/**
 * AJN Liberty Play - Core Types & Interfaces
 * Architectural Invariants & Persistence Facade Envelopes
 */

export type KernelStateValue = 'BOOT' | 'HOME' | 'GUIDE' | 'PLAYBACK' | 'RECOVERY';

export interface PersistedKernelEnvelope<T> {
  schemaVersion: number;
  bootId: string;
  updatedAt: number;
  data: T;
}

export interface ChannelSource {
  id: number;
  channel_id: number;
  type: string;
  url: string;
  is_active: boolean;
}

export interface ProgramSchedule {
  id: number;
  channel_id: number;
  title: string;
  start_time: string;
  end_time: string;
  media_url: string;
  duration_seconds: number;
  timezone?: string;
}

export interface Channel {
  id: number;
  slug: string;
  name: string;
  logo_url?: string;
  sources: ChannelSource[];
  schedules: ProgramSchedule[];
}

export interface PlaybackSessionCache {
  lastChannelId: number;
  positionSeconds: number;
  programId: number;
  cachedSchedules: ProgramSchedule[];
}

export interface UserPreferences {
  schemaVersion: number;
  theatreMode: boolean;
  defaultStartupView: 'GUIDE' | 'HOME';
  lastSafeRoute: 'GUIDE' | 'HOME';
}

export interface ArchiveMediaRecord {
  id: string;
  sourceUrl: string;
  filename: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // e.g. "Friday"
  program: string; // e.g. "War Room"
  segment?: string; // e.g. "Hour 3"
  title: string;
  extension: string; // e.g. "m4v"
  mediaType: 'video' | 'audio';
  duration?: number; // seconds
  status: 'discovered' | 'valid' | 'loading' | 'ready' | 'playing' | 'paused' | 'failed' | 'invalid';
  discoveredAt: string;
  thumbnailUrl?: string;
  integrityError?: string;
}

export interface ImportResultSummary {
  totalDiscovered: number;
  validCount: number;
  duplicateCount: number;
  invalidDateCount: number;
  records: ArchiveMediaRecord[];
}

export interface ResumeRecord {
  mediaId: string;
  position: number;
  updatedAt: number;
  programTitle: string;
  dateStr: string;
}

