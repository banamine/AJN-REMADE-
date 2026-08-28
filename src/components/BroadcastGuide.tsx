/**
 * Broadcast TV Guide UI Component
 * Renders channels and schedule grid queried from GET /api/v1/guide,
 * utilizing authoritative BroadcastClock for dynamic LIVE badge calculation.
 */

import React, { useEffect, useState } from 'react';
import { Channel, ProgramSchedule } from '../types';
import { RefreshCw, Tv, Calendar, AlertCircle } from 'lucide-react';
import { PlayIcon } from './icons/PlayerIcons';
import { broadcastClock } from '../services/BroadcastClock';

interface BroadcastGuideProps {
  onSelectProgram: (program: ProgramSchedule, channel: Channel) => void;
}

export function BroadcastGuide({ onSelectProgram }: BroadcastGuideProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('checking...');
  const [, setTick] = useState<number>(0);

  // Periodic tick every 10s to keep LIVE calculations fresh against BroadcastClock
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchGuide = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/guide');
      const data = await res.json();
      if (res.ok && data.success) {
        setChannels(data.channels || []);
        setDataSource(data.source || 'postgresql');
      } else {
        setError(data.error || 'Database unreachable or guide feed empty.');
        setChannels([]);
      }
    } catch (err) {
      setError((err as Error).message);
      setChannels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuide();
  }, []);

  return (
    <div className="flex flex-col h-full bg-background text-textMain p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-borderSubtle">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-primary flex items-center gap-3">
            <Tv className="w-8 h-8 text-primary animate-pulse" />
            AJN LIBERTY PLAY — BROADCAST GUIDE
          </h1>
          <p className="text-sm text-textMuted mt-1">
            Authoritative PostgreSQL Feed • Data Source: <span className="font-mono text-primary">{dataSource}</span>
          </p>
        </div>
        <button
          onClick={fetchGuide}
          className="flex items-center gap-2 bg-surface hover:bg-surfaceHover border border-borderSubtle px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer shadow"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Guide
        </button>
      </div>

      {loading && channels.length === 0 && (
        <div className="flex items-center justify-center py-20 text-textMuted">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p>Querying authoritative PostgreSQL schedule stream...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/85 border border-red-500 text-red-100 px-6 py-4 rounded-xl backdrop-blur-sm mb-6 flex items-center justify-between shadow-glow">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-300 shrink-0" />
            <div>
              <h3 className="font-bold">Database / API Offline State</h3>
              <p className="text-xs text-red-200 mt-0.5">{error}</p>
            </div>
          </div>
          <button onClick={fetchGuide} className="bg-red-950 hover:bg-red-900 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer border border-red-700">
            Retry Connection
          </button>
        </div>
      )}

      {!loading && channels.length === 0 && !error && (
        <div className="text-center py-20 text-textMuted bg-surface border border-borderSubtle rounded-2xl p-8">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40 text-primary" />
          <h3 className="text-lg font-bold text-textMain mb-1">No Active Channels or Schedule Data</h3>
          <p className="text-xs text-textMuted max-w-md mx-auto mb-6">
            The database is currently empty or unseeded. Authoritative data contract requires valid PostgreSQL schedule rows.
          </p>
          <button
            onClick={async () => {
              await fetch('/api/v1/seed', { method: 'POST' });
              fetchGuide();
            }}
            className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-glow cursor-pointer"
          >
            Seed Database & Reload Guide
          </button>
        </div>
      )}

      <div className="space-y-6">
        {channels.map((channel) => (
          <div key={channel.id} className="bg-surface border border-borderSubtle rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-borderSubtle">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-primary font-bold overflow-hidden">
                  {channel.logo_url ? (
                    <img src={channel.logo_url} alt={channel.name} className="w-full h-full object-cover" />
                  ) : (
                    channel.name.charAt(0)
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-textMain">{channel.name}</h3>
                  <span className="text-xs font-mono text-primary bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    {channel.slug}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">POSTGRESQL SYNCED</span>
              </div>
            </div>

            <div className="guide-grid">
              <div className="guide-row bg-surfaceHover font-bold text-xs uppercase tracking-widest text-textMuted">
                <div className="guide-cell">Channel</div>
                <div className="guide-cell">Schedule Item & Title</div>
                <div className="guide-cell">Time Slot & Status</div>
              </div>
              {channel.schedules && channel.schedules.length > 0 ? (
                channel.schedules.map((program) => {
                  const isLive = broadcastClock.isLive(program.start_time, program.end_time);
                  return (
                    <div
                      key={program.id}
                      onClick={() => onSelectProgram(program, channel)}
                      className={`guide-row cursor-pointer ${isLive ? 'active-program' : ''}`}
                    >
                      <div className="guide-cell font-mono text-xs text-primary">
                        {channel.slug}
                      </div>
                      <div className="guide-cell">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-textMain">{program.title}</span>
                          {isLive && (
                            <span className="bg-accent/20 border border-accent/40 text-accent text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                              LIVE
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-textMuted font-mono mt-1">{Math.round(program.duration_seconds / 60)} mins</span>
                      </div>
                      <div className="guide-cell flex flex-row items-center justify-between">
                        <div>
                          <span className="text-xs text-accent font-mono block">
                            {broadcastClock.formatTime(program.start_time)} — {broadcastClock.formatTime(program.end_time)}
                          </span>
                          <span className="text-[10px] text-textMuted font-mono truncate max-w-[220px] block mt-0.5">
                            {program.media_url}
                          </span>
                        </div>
                        <button className="bg-primary hover:bg-blue-600 text-white p-2 rounded-lg font-bold transition-transform hover:scale-105 flex items-center justify-center shadow cursor-pointer">
                          <PlayIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-textMuted text-sm">
                  No programs scheduled currently for this channel.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
