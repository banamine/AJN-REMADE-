/**
 * Audio Player Component
 * Dedicated audio playback surface featuring deep slate background,
 * red playback scan/waveform, simple transport controls, skip 10s, volume,
 * and media-type isolation for historical & educational audio records.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ArchiveMediaRecord, ResumeRecord } from '../types';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, RotateCcw, ArrowLeft, Headphones, AlertTriangle } from 'lucide-react';

interface AudioPlayerProps {
  activeRecord: ArchiveMediaRecord;
  allRecords: ArchiveMediaRecord[];
  onSelectRecord: (record: ArchiveMediaRecord) => void;
  onBackToArchive: () => void;
}

export function AudioPlayer({
  activeRecord,
  allRecords,
  onSelectRecord,
  onBackToArchive,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [playbackState, setPlaybackState] = useState<'IDLE' | 'LOADING' | 'READY' | 'PLAYING' | 'PAUSED' | 'ENDED' | 'ERROR'>('LOADING');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resume State
  const [resumePrompt, setResumePrompt] = useState<ResumeRecord | null>(null);
  const [resumeChecked, setResumeChecked] = useState<boolean>(false);

  useEffect(() => {
    setPlaybackState('LOADING');
    setCurrentTime(0);
    setErrorMessage(null);
    setResumeChecked(false);

    try {
      const savedKey = `ajn_resume_audio_${activeRecord.id}`;
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
    const audio = audioRef.current;
    if (!audio || !resumeChecked) return;

    audio.src = activeRecord.sourceUrl;
    audio.load();
    setPlaybackState('READY');

    if (resumePrompt && resumePrompt.position > 0) {
      audio.currentTime = resumePrompt.position;
    }

    audio.play().then(() => {
      setIsPlaying(true);
      setPlaybackState('PLAYING');
    }).catch((err) => {
      console.warn('Audio autoplay blocked:', err);
      setPlaybackState('PAUSED');
    });

    return () => {
      audio.pause();
      audio.src = '';
      audio.load();
    };
  }, [activeRecord.sourceUrl, resumeChecked]);

  // Position persistence every 5s
  useEffect(() => {
    const timer = setInterval(() => {
      if (audioRef.current && isPlaying) {
        const pos = audioRef.current.currentTime;
        const record: ResumeRecord = {
          mediaId: activeRecord.id,
          position: pos,
          updatedAt: Date.now(),
          programTitle: activeRecord.title,
          dateStr: `${activeRecord.dayOfWeek}, ${activeRecord.date}`
        };
        try {
          localStorage.setItem(`ajn_resume_audio_${activeRecord.id}`, JSON.stringify(record));
        } catch {}
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [isPlaying, activeRecord]);

  const validRecords = useMemo(() => allRecords.filter(r => r.status !== 'invalid' && r.mediaType === 'audio'), [allRecords]);
  const currentIndex = validRecords.findIndex(r => r.id === activeRecord.id);
  const prevRecord = currentIndex > 0 ? validRecords[currentIndex - 1] : null;
  const nextRecord = currentIndex >= 0 && currentIndex < validRecords.length - 1 ? validRecords[currentIndex + 1] : null;

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setPlaybackState('PAUSED');
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
        setPlaybackState('PLAYING');
      }).catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (audioRef.current) audioRef.current.currentTime = targetTime;
  };

  const skipTime = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(Math.max(audioRef.current.currentTime + seconds, 0), duration || 3600);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setIsMuted(v === 0);
    if (audioRef.current) {
      audioRef.current.volume = v;
      audioRef.current.muted = v === 0;
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
    <div className="flex flex-col h-full bg-[#1C2B3A] text-[#F8F9FA] p-6 relative select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#33475B]">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToArchive}
            className="flex items-center gap-2 bg-[#243548] hover:bg-[#2E445D] border border-[#33475B] px-3.5 py-2 rounded-xl font-medium text-xs text-[#F8F9FA] transition-colors cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#C19A6B]" />
            Back to Archive
          </button>
          <div>
            <div className="text-[11px] font-mono text-red-400 uppercase tracking-widest flex items-center gap-2">
              <Headphones className="w-3.5 h-3.5" /> AUDIO ARCHIVE SURFACE • STATE: {playbackState}
            </div>
            <h2 className="text-lg font-bold font-serif text-[#F8F9FA] truncate max-w-xl">
              {activeRecord.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => prevRecord && onSelectRecord(prevRecord)}
            disabled={!prevRecord}
            className="flex items-center gap-1 bg-[#243548] hover:bg-[#2E445D] disabled:opacity-40 border border-[#33475B] px-3 py-2 rounded-xl text-xs font-medium text-[#F8F9FA] cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Previous</span>
          </button>
          <button
            onClick={() => nextRecord && onSelectRecord(nextRecord)}
            disabled={!nextRecord}
            className="flex items-center gap-1 bg-[#243548] hover:bg-[#2E445D] disabled:opacity-40 border border-[#33475B] px-3 py-2 rounded-xl text-xs font-medium text-[#F8F9FA] cursor-pointer"
          >
            <span className="hidden sm:inline">Next</span>
            <SkipForward className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>

      {/* Resume Prompt */}
      {resumePrompt && !resumeChecked && (
        <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#243548] border border-[#33475B] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-serif text-[#F8F9FA]">Resume audio playback?</h3>
                <p className="text-xs text-[#94A3B8]">{activeRecord.title}</p>
              </div>
            </div>
            <div className="bg-[#1C2B3A] p-3 rounded-xl border border-[#33475B] text-xs font-mono text-[#F8F9FA] flex justify-between items-center">
              <span>Saved Position:</span>
              <span className="text-red-400 font-bold">{Math.floor(resumePrompt.position / 60)} mins {Math.floor(resumePrompt.position % 60)} secs</span>
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
                  if (audioRef.current) audioRef.current.currentTime = resumePrompt.position;
                  setResumePrompt(null);
                  setResumeChecked(true);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration || activeRecord.duration || 3600)}
        onPlay={() => { setIsPlaying(true); setPlaybackState('PLAYING'); }}
        onPause={() => { setIsPlaying(false); setPlaybackState('PAUSED'); }}
        onEnded={() => { setIsPlaying(false); setPlaybackState('ENDED'); }}
        onError={() => { setPlaybackState('ERROR'); setErrorMessage('Audio stream unavailable or decoding error.'); }}
      />

      {/* Central Audio Surface / Red Waveform Scan */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#16222F] border border-[#33475B] rounded-2xl p-8 shadow-2xl relative overflow-hidden gap-8">
        {playbackState === 'ERROR' ? (
          <div className="flex flex-col items-center justify-center text-center p-6 text-[#94A3B8] gap-3">
            <AlertTriangle className="w-12 h-12 text-red-400" />
            <h3 className="text-base font-bold text-[#F8F9FA]">Audio Unavailable</h3>
            <p className="text-xs text-red-300 max-w-md">{errorMessage || 'Unable to load audio recording.'}</p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => { setPlaybackState('LOADING'); if (audioRef.current) audioRef.current.load(); }}
                className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
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
          <>
            <div className="text-center space-y-2 max-w-lg">
              <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-full text-xs font-mono text-red-400">
                <Headphones className="w-3.5 h-3.5" /> Historical Audio Archive Stream
              </div>
              <h3 className="text-xl md:text-2xl font-bold font-serif text-[#F8F9FA]">
                {activeRecord.program}
              </h3>
              <p className="text-sm font-mono text-[#94A3B8]">{activeRecord.segment} • {activeRecord.dayOfWeek}, {activeRecord.date}</p>
            </div>

            {/* Red Waveform / Scan Visualizer Box */}
            <div className="w-full max-w-2xl bg-[#1C2B3A] border border-red-500/30 rounded-2xl p-6 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/5 to-transparent pointer-events-none"></div>
              
              {/* Waveform Bars / Scan Graphic */}
              <div className="flex items-center justify-center gap-1.5 h-20 w-full px-4">
                {Array.from({ length: 48 }).map((_, i) => {
                  const heightFactor = isPlaying ? Math.sin((currentTime * 3) + i * 0.3) * 0.5 + 0.6 : 0.25;
                  const barHeight = Math.max(12, Math.floor(heightFactor * 64));
                  return (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full transition-all duration-150 ${isPlaying ? 'bg-red-500 shadow-glow' : 'bg-[#4A637C]'}`}
                      style={{ height: `${barHeight}px` }}
                    />
                  );
                })}
              </div>

              <div className="text-xs font-mono text-red-400 mt-2 tracking-widest uppercase">
                {isPlaying ? '─────── PLAYING RED WAVEFORM / SCAN ───────' : '─────── PAUSED / SETTLED ───────'}
              </div>
            </div>

            {/* Time Stats */}
            <div className="flex items-center justify-between w-full max-w-2xl text-xs font-mono text-[#94A3B8] px-2">
              <span className="text-red-400 font-bold">{formatTime(currentTime)}</span>
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-red-500 animate-ping' : 'bg-zinc-500'}`}></span>
                {playbackState}
              </span>
              <span>{formatTime(duration)}</span>
            </div>
          </>
        )}
      </div>

      {/* Transport Controls Bar */}
      <div className="mt-6 bg-[#243548] border border-[#33475B] rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-[#94A3B8] w-12 text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 3600}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 accent-red-500 cursor-pointer h-2 bg-[#1C2B3A] rounded-lg"
          />
          <span className="text-xs font-mono text-[#94A3B8] w-12">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#33475B]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => skipTime(-10)}
              className="px-3 py-1.5 rounded-xl bg-[#1C2B3A] hover:bg-[#16222F] border border-[#33475B] text-xs font-mono text-[#94A3B8] hover:text-white cursor-pointer"
              title="Skip back 10 seconds"
            >
              ◀ 10s
            </button>

            <button
              onClick={handlePlayPause}
              className="w-12 h-12 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center font-bold transition-transform hover:scale-105 cursor-pointer shadow-lg"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => skipTime(10)}
              className="px-3 py-1.5 rounded-xl bg-[#1C2B3A] hover:bg-[#16222F] border border-[#33475B] text-xs font-mono text-[#94A3B8] hover:text-white cursor-pointer"
              title="Skip forward 10 seconds"
            >
              10s ▶
            </button>

            <div className="flex items-center gap-2 ml-4">
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
                className="w-20 accent-red-500 cursor-pointer h-1 bg-[#1C2B3A] rounded-lg"
              />
            </div>
          </div>

          <div className="text-xs font-mono text-[#94A3B8] hidden sm:block">
            Audio Exclusivity Enforced • Isolated Stream
          </div>
        </div>
      </div>
    </div>
  );
}
