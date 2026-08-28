/**
 * Playback Core Surface Component
 * Mounts HTML5 video element loading proxied media_url via UnifiedPlaybackEngine,
 * updates playback position in IndexedDB every 5s, handles fallback streams on error,
 * and provides simulated playback crash testing for the guardrail engine.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ProgramSchedule, Channel } from '../types';
import { persistenceFacade } from '../kernel/KernelPersistenceFacade';
import { UnifiedPlaybackEngine } from '../services/UnifiedPlaybackEngine';
import { ArrowLeft, AlertTriangle, ShieldCheck } from 'lucide-react';
import Hls from 'hls.js';

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
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [fallbackActive, setFallbackActive] = useState<boolean>(false);

  const engine = useMemo(() => {
    return new UnifiedPlaybackEngine(program.media_url);
  }, [program.media_url]);

  useEffect(() => {
    async function initStream() {
      // Reset the engine and force the <video> element to reload on every
      // kernel-level retry, not just on first mount. Previously this effect
      // only depended on [engine], so PLAY_ERROR -> PLAYBACK retries never
      // actually re-attempted the stream -- retryCount would climb but
      // nothing re-fetched or reloaded, leaving playback stuck forever.
      engine.reset();
      const url = await engine.verifyAndSelectBestStream();
      setStreamUrl(url);
    }
    initStream();
  }, [engine, retryCount]);

  useEffect(() => {
    let hls: Hls | null = null;
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    console.log('[PlaybackSurface] Initializing stream URL:', streamUrl);

    if (Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[PlaybackSurface] HLS manifest parsed successfully. Triggering play().');
        video.play().catch((err) => {
          console.warn('[PlaybackSurface] video.play() failed on MANIFEST_PARSED:', err);
        });
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('[PlaybackSurface] HLS error event:', data.type, data.details, data.fatal);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[PlaybackSurface] Fatal HLS network error, attempting startLoad()...');
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[PlaybackSurface] Fatal HLS media error, attempting recoverMediaError()...');
              hls?.recoverMediaError();
              break;
            default:
              console.error('[PlaybackSurface] Unrecoverable HLS fatal error, triggering fallback.');
              handleVideoError();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('[PlaybackSurface] Using native HLS playback support.');
      video.src = streamUrl;
      video.play().catch((err) => {
        console.warn('[PlaybackSurface] Native HLS video.play() failed:', err);
      });
    } else {
      console.log('[PlaybackSurface] Using direct video source playback.');
      video.src = streamUrl;
      video.play().catch((err) => {
        console.warn('[PlaybackSurface] Direct video.play() failed:', err);
      });
    }

    return () => {
      if (hls) {
        console.log('[PlaybackSurface] Destroying HLS instance on cleanup.');
        hls.destroy();
      }
    };
  }, [streamUrl]);

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

  // Handle video error event with automatic fallback circuit breaker
  const handleVideoError = () => {
    const nextUrl = engine.switchToFallback();
    if (nextUrl) {
      setFallbackActive(true);
      setStreamUrl(nextUrl);
      setToastMessage('Stream error detected. Switched to backup resilient stream...');
      setTimeout(() => setToastMessage(null), 3000);
      if (videoRef.current) {
        videoRef.current.load();
        videoRef.current.play().catch(() => {});
      }
    } else {
      const err = 'HTML5 Media Element encountered a network or codec decode error on all fallback streams.';
      onPlayError(err);
    }
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
            <div className="text-xs font-mono text-primary uppercase tracking-widest flex items-center gap-2">
              <span>{channel?.name || 'AJN Broadcast'} • Retry Attempt {retryCount}/3</span>
              {fallbackActive && <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded text-[10px]">FALLBACK ACTIVE</span>}
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
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-blue-900/90 border border-blue-500 text-blue-100 px-4 py-3 rounded-xl backdrop-blur-sm shadow-2xl text-sm font-semibold animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Video Stage with Sophisticated Dark Player Container class */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-black aspect-video rounded-lg shadow-glow">
        {streamUrl ? (
          <video
            ref={videoRef}
            src={!Hls.isSupported() ? streamUrl : undefined}
            controls
            autoPlay
            playsInline
            onError={handleVideoError}
            onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-400 gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-mono">Resolving proxy stream & circuit breaker...</p>
          </div>
        )}

        {!streamUrl && !program.media_url && (
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
            STREAM PROXY & CIRCUIT BREAKER ACTIVE
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
