/**
 * Archive Home Component
 * Default landing screen displaying Latest Archive, video & audio series,
 * and quick resume / playback triggers.
 */

import React from 'react';
import { ArchiveMediaRecord, ResumeRecord } from '../types';
import { Play, Calendar, Film, Headphones, ShieldCheck, ArrowRight } from 'lucide-react';

interface ArchiveHomeProps {
  records: ArchiveMediaRecord[];
  onSelectRecord: (record: ArchiveMediaRecord) => void;
  onSelectProgram: (programName: string) => void;
}

export function ArchiveHome({
  records,
  onSelectRecord,
  onSelectProgram,
}: ArchiveHomeProps) {
  const validRecords = records.filter(r => r.status !== 'invalid');
  const latestDate = '2026-08-28';
  const latestRecords = validRecords.filter(r => r.date === latestDate);

  const latestByProgram: Record<string, ArchiveMediaRecord[]> = {};
  for (const r of latestRecords) {
    if (!latestByProgram[r.program]) latestByProgram[r.program] = [];
    latestByProgram[r.program].push(r);
  }

  // Check resume records for video and audio
  let latestResumeRecord: ResumeRecord | null = null;
  try {
    for (const r of validRecords) {
      const prefix = r.mediaType === 'audio' ? 'ajn_resume_audio_' : 'ajn_resume_video_';
      const saved = localStorage.getItem(`${prefix}${r.id}`);
      if (saved) {
        const parsed: ResumeRecord = JSON.parse(saved);
        if (!latestResumeRecord || parsed.updatedAt > latestResumeRecord.updatedAt) {
          latestResumeRecord = parsed;
        }
      }
    }
  } catch {}

  const resumeMediaRecord = latestResumeRecord ? validRecords.find(r => r.id === latestResumeRecord?.mediaId) : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1C2B3A] text-[#F8F9FA] p-6 overflow-y-auto space-y-8">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-[#243548] to-[#16222F] border border-[#33475B] rounded-2xl p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-[#C19A6B]/15 border border-[#C19A6B]/30 px-3 py-1 rounded-full text-xs font-mono text-[#C19A6B]">
            <ShieldCheck className="w-3.5 h-3.5" />
            Authoritative Digital Media Library & Archive
          </div>
          <h1 className="text-3xl md:text-4xl font-black font-serif tracking-tight text-[#F8F9FA]">
            Historical & Educational Broadcast Archives
          </h1>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Explore verified historical video and audio media records with strict date integrity, cryptographic checksum validation, and isolated playback surfaces.
          </p>
        </div>

        {resumeMediaRecord && latestResumeRecord && (
          <div className="bg-[#1C2B3A] border border-[#33475B] rounded-xl p-5 w-full md:w-80 space-y-3 shadow-md shrink-0">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#C19A6B]">
              <span>RESUME {resumeMediaRecord.mediaType.toUpperCase()}</span>
              <span>{Math.floor(latestResumeRecord.position / 60)}m elapsed</span>
            </div>
            <h4 className="font-bold text-sm text-[#F8F9FA] line-clamp-1">{resumeMediaRecord.title}</h4>
            <button
              onClick={() => onSelectRecord(resumeMediaRecord)}
              className="w-full flex items-center justify-center gap-2 bg-[#C19A6B] hover:bg-[#b0885a] text-[#1C2B3A] py-2 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Continue Playback
            </button>
          </div>
        )}
      </div>

      {/* Latest Archive Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#C19A6B]/20 border border-[#C19A6B]/40 flex items-center justify-center text-[#C19A6B]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif text-[#F8F9FA]">Latest Archive Stream</h2>
              <p className="text-xs text-[#94A3B8]">Friday, August 28, 2026 • Verified Broadcast Logs</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(latestByProgram).map(([progName, items]) => {
            const isAudioProgram = items.every(i => i.mediaType === 'audio');
            return (
              <div key={progName} className="bg-[#243548] border border-[#33475B] rounded-2xl p-6 shadow-xl flex flex-col justify-between gap-6">
                <div>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#33475B]">
                    <h3 className="text-base font-bold font-serif text-[#C19A6B] flex items-center gap-2">
                      {isAudioProgram ? <Headphones className="w-4 h-4 text-red-400" /> : <Film className="w-4 h-4" />}
                      {progName}
                    </h3>
                    <button
                      onClick={() => onSelectProgram(progName)}
                      className="text-xs font-mono text-[#94A3B8] hover:text-[#F8F9FA] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      View All ({items.length}) <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {items.map((record) => {
                      const isAudio = record.mediaType === 'audio';
                      return (
                        <div
                          key={record.id}
                          onClick={() => onSelectRecord(record)}
                          className="group flex items-center justify-between p-3 rounded-xl bg-[#1C2B3A] border border-[#33475B] hover:border-[#C19A6B] transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3 truncate">
                            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${isAudio ? 'bg-red-500/10 border-red-500/30 text-red-400 group-hover:bg-red-600 group-hover:text-white' : 'bg-[#243548] border-[#33475B] text-[#C19A6B] group-hover:bg-[#C19A6B] group-hover:text-[#1C2B3A]'}`}>
                              {isAudio ? <Headphones className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                            </div>
                            <div className="truncate">
                              <h4 className="text-xs font-bold text-[#F8F9FA] truncate">{record.segment || 'Segment'}</h4>
                              <span className="text-[10px] font-mono text-[#94A3B8]">{isAudio ? 'Audio Stream' : 'Video Stream'}</span>
                            </div>
                          </div>
                          <span className={`text-xs font-mono px-2 py-1 rounded border shrink-0 ${isAudio ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-[#C19A6B]/10 text-[#C19A6B] border-[#C19A6B]/20'}`}>
                            Play
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 text-[11px] font-mono text-[#94A3B8] border-t border-[#33475B]">
                  <span>Status: Authoritative Ready</span>
                  <span className="text-emerald-400">● Isolated Surface</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
