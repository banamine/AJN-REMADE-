/**
 * Video Player Component
 * Authoritative video playback surface for video archive records.
 * Owns video element, controls, resume persistence, and error recovery.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ArchiveMediaRecord, ResumeRecord } from '../types';
import { UnifiedPlaybackEngine } from '../services/UnifiedPlaybackEngine';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Maximize, Minimize, AlertTriangle, RotateCcw, ArrowLeft, Film } from 'lucide-react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  activeRecord: ArchiveMediaRecord;
  allRecords: ArchiveMediaRecord[];
  onSelectRecord: (record: ArchiveMediaRecord) => void;
  onBackToArchive: () => void;
}

export function VideoPlayer({
  activeRecord,
  allRecords,
  onSelectRecord,
  onBackToArchive,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [playbackState, setPlaybackState] = useState<'selected' | 'loading' | 'ready' | 'playing' | 'paused' | 'failed'>('selected');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resume State
  const [resumePrompt, setResumePrompt] = useState<ResumeRecord | null>(null);
  const [resumeChecked, setResumeChecked] = useState<boolean>(false);

  const engine = useMemo(() => {
    return new UnifiedPlaybackEngine(activeRecord.sourceUrl);
  }, [activeRecord.id]);

  useEffect(() => {
    setPlaybackState('selected');
    setCurrentTime(0);
    setErrorMessage(null);
    setResumeChecked(false);

    try {
      const savedKey = `ajn_resume_video_${activeRecord.id}`;
      const savedData = localStorage.getItem(savedKey);
      if (savedData) {
        const record: ResumeRecord = JSON.parse(savedData);
        if (record && record.position > 10) {
          setResumePrompt(record);
        } else {
          setResumeChecked(true);
        }
      } else {
        setResumeChecked(true);
      }
    } catch {
      setResumeChecked(true);
    }
  }, [activeRecord.id]);

  useEffect(() => {
    if (!resumeChecked) return;

    async function loadStream() {
      setPlaybackState('loading');
      try {
        engine.reset();
        const url = await engine.verifyAndSelectBestStream();
        setStreamUrl(url);
      } catch (err) {
        console.error('Failed to resolve video stream:', err);
        setPlaybackState('failed');
        setErrorMessage('Unable to load this video recording. Stream resolution failed.');
      }
    }
    loadStream();
  }, [engine, resumeChecked]);

  useEffect(() => {
    let hls: Hls | null = null;
    const video = videoRef.current;
    if (!video || !streamUrl || !resumeChecked) return;

    if (Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 30 });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setPlaybackState('ready');
        if (resumePrompt && resumePrompt.position > 0) {
          video.currentTime = resumePrompt.position;
        }
        video.play().then(() => {
          setIsPlaying(true);
          setPlaybackState('playing');
        }).catch(() => setPlaybackState('paused'));
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setPlaybackState('failed');
          setErrorMessage(`Video playback error (${data.details}).`);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      if (resumePrompt && resumePrompt.position > 0) {
        video.currentTime = resumePrompt.position;
      }
      setPlaybackState('ready');
      video.play().then(() => {
        setIsPlaying(true);
        setPlaybackState('playing');
      }).catch(() => setPlaybackState('paused'));
    } else {
      video.src = streamUrl;
      setPlaybackState('ready');
      video.play().then(() => {
        setIsPlaying(true);
        setPlaybackState('playing');
      }).catch(() => setPlaybackState('paused'));
    }

    return () => {
      if (hls) hls.destroy();
      video.pause();
      video.src = '';
      video.load();
    };
  }, [streamUrl, resumeChecked]);

  // Position persistence every 5s
  useEffect(() => {
    const timer = setInterval(() => {
      if (videoRef.current && isPlaying) {
        const pos = videoRef.current.currentTime;
        const record: ResumeRecord = {
          mediaId: activeRecord.id,
          position: pos,
          updatedAt: Date.now(),
          programTitle: activeRecord.title,
          dateStr: `${activeRecord.dayOfWeek}, ${activeRecord.date}`
        };
        try {
          localStorage.setItem(`ajn_resume_video_${activeRecord.id}`, JSON.stringify(record));
        } catch {}
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [isPlaying, activeRecord]);

  const validRecords = useMemo(() => allRecords.filter(r => r.status !== 'invalid' && r.mediaType === 'video'), [allRecords]);
  const currentIndex = validRecords.findIndex(r => r.id === activeRecord.id);
  const prevRecord = currentIndex > 0 ? validRecords[currentIndex - 1] : null;
  const nextRecord = currentIndex >= 0 && currentIndex < validRecords.length - 1 ? validRecords[currentIndex + 1] : null;

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      setPlaybackState('paused');
    } else {
      video.play().then(() => {
        setIsPlaying(true);
        setPlaybackState('playing');
      }).catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) videoRef.current.currentTime = targetTime;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setIsMuted(v === 0);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div ref={containerRef} className={`flex flex-col h-full bg-[#1C2B3A] text-[#F8F9FA] relative select-none ${isTheaterMode ? 'fixed inset-0 z-50 p-0' : 'p-6'}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#33475B] px-2">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToArchive}
            className="flex items-center gap-2 bg-[#243548] hover:bg-[#2E445D] border border-[#33475B] px-3.5 py-2 rounded-xl font-medium text-xs text-[#F8F9FA] transition-colors cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#C19A6B]" />
            Back to Archive
          </button>
          <div>
            <div className="text-[11px] font-mono text-[#C19A6B] uppercase tracking-widest flex items-center gap-2">
              <span className="flex items-center gap-1"><Film className="w-3.5 h-3.5" /> VIDEO PLAYER</span>
              <span>•</span>
              <span>{activeRecord.program} ({activeRecord.dayOfWeek}, {activeRecord.date})</span>
            </div>
            <h2 className="text-base font-bold font-serif text-[#F8F9FA] truncate max-w-xl">
              {activeRecord.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => prevRecord && onSelectRecord(prevRecord)}
            disabled={!prevRecord}
            className="flex items-center gap-1 bg-[#243548] hover:bg-[#2E445D] disabled:opacity-40 disabled:cursor-not-allowed border border-[#33475B] px-3 py-2 rounded-xl text-xs font-medium text-[#F8F9FA] transition-colors cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5 text-[#C19A6B]" />
            <span className="hidden sm:inline">Previous</span>
          </button>
          <button
            onClick={() => nextRecord && onSelectRecord(nextRecord)}
            disabled={!nextRecord}
            className="flex items-center gap-1 bg-[#243548] hover:bg-[#2E445D] disabled:opacity-40 disabled:cursor-not-allowed border border-[#33475B] px-3 py-2 rounded-xl text-xs font-medium text-[#F8F9FA] transition-colors cursor-pointer"
          >
            <span className="hidden sm:inline">Next</span>
            <SkipForward className="w-3.5 h-3.5 text-[#C19A6B]" />
          </button>
        </div>
      </div>

      {/* Resume Prompt Modal */}
      {resumePrompt && !resumeChecked && (
        <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#243548] border border-[#33475B] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C19A6B]/20 border border-[#C19A6B]/40 flex items-center justify-center text-[#C19A6B]">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-serif text-[#F8F9FA]">Resume video playback?</h3>
                <p className="text-xs text-[#94A3B8]">{activeRecord.title}</p>
              </div>
            </div>
            <div className="bg-[#1C2B3A] p-3 rounded-xl border border-[#33475B] text-xs font-mono text-[#F8F9FA] flex justify-between items-center">
              <span>Saved Position:</span>
              <span className="text-[#C19A6B] font-bold">{Math.floor(resumePrompt.position / 60)} mins {Math.floor(resumePrompt.position % 60)} secs</span>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => { setResumePrompt(null); setResumeChecked(true); }}
                className="px-4 py-2 rounded-xl bg-[#1C2B3A] hover:bg-[#16222F] text-[#94A3B8] text-xs font-medium border border-[#33475B] cursor-pointer"
              >
                Start Over
              </button>
              <button
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = resumePrompt.position;
                  setResumePrompt(null);
                  setResumeChecked(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#C19A6B] hover:bg-[#b0885a] text-[#1C2B3A] text-xs font-bold shadow-md cursor-pointer"
              >
                Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Stage Container */}
      <div className={`flex-1 flex items-center justify-center relative overflow-hidden bg-black rounded-xl border border-[#33475B] shadow-2xl ${isTheaterMode ? 'rounded-none border-none' : ''}`}>
        {playbackState === 'failed' ? (
          <div className="flex flex-col items-center justify-center text-center p-8 text-[#94A3B8] gap-3">
            <AlertTriangle className="w-12 h-12 text-[#C19A6B]" />
            <h3 className="text-base font-bold text-[#F8F9FA]">Video Unavailable</h3>
            <p className="text-xs text-red-300 max-w-md">{errorMessage || 'Unable to load this recording.'}</p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => { setPlaybackState('loading'); if (videoRef.current) videoRef.current.load(); }}
                className="bg-[#C19A6B] text-[#1C2B3A] px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Retry
              </button>
              <button
                onClick={onBackToArchive}
                className="bg-[#243548] text-[#F8F9FA] border border-[#33475B] px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
              >
                Choose Another Recording
              </button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
            onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration || activeRecord.duration || 3600)}
            onPlay={() => { setIsPlaying(true); setPlaybackState('playing'); }}
            onPause={() => { setIsPlaying(false); setPlaybackState('paused'); }}
            onError={() => { setPlaybackState('failed'); setErrorMessage('Video codec or network transmission error.'); }}
            className="w-full h-full object-contain cursor-pointer"
            onClick={handlePlayPause}
          />
        )}

        {(playbackState === 'loading' || playbackState === 'selected') && resumeChecked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1C2B3A]/85 backdrop-blur-xs gap-3">
            <div className="w-10 h-10 border-3 border-[#C19A6B] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-mono text-[#C19A6B] tracking-wider">LOADING ARCHIVE VIDEO STREAM...</p>
          </div>
        )}
      </div>

      {/* Video Controls Bar */}
      <div className="mt-4 bg-[#243548] border border-[#33475B] rounded-xl p-3 flex flex-col gap-2 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#94A3B8] w-12 text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 3600}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 accent-[#C19A6B] cursor-pointer h-1.5 bg-[#1C2B3A] rounded-lg"
          />
          <span className="text-xs font-mono text-[#94A3B8] w-12">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayPause}
              className="w-10 h-10 rounded-xl bg-[#C19A6B] hover:bg-[#b0885a] text-[#1C2B3A] flex items-center justify-center font-bold transition-transform hover:scale-105 cursor-pointer shadow-md"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <div className="flex items-center gap-2 ml-2">
              <button onClick={() => setIsMuted(!isMuted)} className="text-[#94A3B8] hover:text-[#F8F9FA] cursor-pointer">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 accent-[#C19A6B] cursor-pointer h-1 bg-[#1C2B3A] rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              className="px-3 py-1.5 rounded-lg bg-[#1C2B3A] hover:bg-[#16222F] text-[#94A3B8] hover:text-[#F8F9FA] text-xs font-mono border border-[#33475B] cursor-pointer"
            >
              {isTheaterMode ? 'Default View' : 'Theater Mode'}
            </button>
            <button
              onClick={() => {
                if (!containerRef.current) return;
                if (!document.fullscreenElement) {
                  containerRef.current.requestFullscreen().catch(() => {});
                  setIsFullscreen(true);
                } else {
                  document.exitFullscreen().catch(() => {});
                  setIsFullscreen(false);
                }
              }}
              className="p-2 rounded-lg bg-[#1C2B3A] hover:bg-[#16222F] text-[#94A3B8] hover:text-[#F8F9FA] border border-[#33475B] cursor-pointer"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
