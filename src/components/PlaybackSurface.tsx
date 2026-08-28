/**
 * Playback Core Surface Component
 * Mounts HTML5 video element loading media_url, updates playback position in IndexedDB every 5s,
 * and provides simulated playback crash testing for the guardrail engine (3 retries -> auto-heal to GUIDE).
 */

import React, { useEffect, useRef, useState } from 'react';
import { ProgramSchedule, Channel } from '../types';
import { persistenceFacade } from '../kernel/KernelPersistenceFacade';
import { ArrowLeft, AlertTriangle, RotateCcw, Volume2, Maximize2 } from 'lucide-react';
import { PlayIcon, PauseIcon, VolumeIcon, FullscreenIcon } from './icons/PlayerIcons';

interface PlaybackSurfaceProps {
  program: ProgramSchedule;
  channel: Channel | null;
  retryCount: number;
  onBackToGuide: () => void;
  onPlayError: (errorMsg: string) => void;
}

export function PlaybackSurface({
  program,
  channel,
  retryCount,
  onBackToGuide,
  onPlayError,
}: PlaybackSurfaceProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Position updater interval (every 5 seconds -> write silently into IndexedDB)
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && channel) {
        const pos = videoRef.current.currentTime;
        setCurrentTime(pos);
        persistenceFacade.setIndexedDBCache({
          lastChannelId: channel.id,
          positionSeconds: pos,
          programId: program.id,
          cachedSchedules: channel.schedules || [],
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [channel, program]);

  // Handle video error event
  const handleVideoError = () => {
    const err = 'HTML5 Media Element encountered a network or codec decode error.';
    onPlayError(err);
  };

  // Trigger simulated crash for testing guardrail
  const triggerSimulatedCrash = () => {
    const err = 'Simulated Playback Crash (User triggered test error)';
    setToastMessage('Triggering simulated playback crash...');
    setTimeout(() => {
      setToastMessage(null);
      onPlayError(err);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-background text-textMain relative select-none p-6">
      {/* Top Header Overlay */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToGuide}
            className="flex items-center gap-2 bg-surface hover:bg-surfaceHover border border-borderSubtle px-4 py-2 rounded-xl font-medium text-sm transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Guide
          </button>
          <div>
            <div className="text-xs font-mono text-primary uppercase tracking-widest">
              {channel?.name || 'AJN Broadcast'} • Retry Attempt {retryCount}/3
            </div>
            <h2 className="text-lg font-bold text-textMain truncate max-w-xl">
              {program.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={triggerSimulatedCrash}
            className="flex items-center gap-2 bg-amber-950/80 hover:bg-amber-900 border border-amber-700 px-3 py-2 rounded-xl text-xs font-semibold text-amber-200 transition-colors cursor-pointer"
            title="Trigger simulated playback error to test guardrail auto-heal"
          >
            <AlertTriangle className="w-4 h-4 text-accent" />
            Simulate Play Crash ({retryCount}/3)
          </button>
        </div>
      </div>

      {/* Non-blocking Toast Notification */}
      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-red-900/80 border border-red-500 text-red-100 px-4 py-3 rounded backdrop-blur-sm shadow-2xl text-sm font-semibold animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Video Stage with Sophisticated Dark Player Container class */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-black aspect-video rounded-lg shadow-glow">
        <video
          ref={videoRef}
          src={program.media_url}
          controls
          autoPlay
          playsInline
          onError={handleVideoError}
          onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
          className="w-full h-full object-contain"
        />

        {!program.media_url && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface text-textMuted p-6">
            <AlertTriangle className="w-12 h-12 text-accent mb-2" />
            <p className="text-lg font-semibold">No valid media URL provided for this schedule item.</p>
          </div>
        )}
      </div>

      {/* Bottom Telemetry Bar */}
      <div className="mt-4 flex items-center justify-between text-xs font-mono text-textMuted bg-surface p-3 rounded-lg border border-borderSubtle">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            INDEXED_DB PERSISTENCE ACTIVE
          </span>
          <span>POSITION: {Math.floor(currentTime)}s</span>
        </div>
        <div>
          DURATION: {Math.round(program.duration_seconds / 60)} MINS
        </div>
      </div>
    </div>
  );
}
