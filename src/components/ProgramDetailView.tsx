/**
 * Program Detail View Component
 * Renders program overview and available segments list with pagination controls
 * (e.g. 9 items per page with ‹ Previous 1 2 3 Next ›) and media-type badges.
 */

import React, { useState } from 'react';
import { ArchiveMediaRecord } from '../types';
import { Play, Calendar, Clock, ArrowLeft, Film, ShieldCheck, Headphones } from 'lucide-react';

interface ProgramDetailViewProps {
  programName: string;
  records: ArchiveMediaRecord[];
  activeRecord: ArchiveMediaRecord | null;
  onSelectRecord: (record: ArchiveMediaRecord) => void;
  onBackToHome: () => void;
}

export function ProgramDetailView({
  programName,
  records,
  activeRecord,
  onSelectRecord,
  onBackToHome,
}: ProgramDetailViewProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 9;

  const programRecords = records.filter(r => r.program.toLowerCase() === programName.toLowerCase() && r.status !== 'invalid');
  programRecords.sort((a, b) => b.filename.localeCompare(a.filename));

  const totalPages = Math.ceil(programRecords.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRecords = programRecords.slice(startIndex, startIndex + itemsPerPage);

  const sampleRecord = programRecords[0];
  const dateStr = sampleRecord ? `${sampleRecord.dayOfWeek}, ${sampleRecord.date}` : 'Historical Archive';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1C2B3A] text-[#F8F9FA] p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#33475B]">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-2 bg-[#243548] hover:bg-[#2E445D] border border-[#33475B] px-3.5 py-2 rounded-xl font-medium text-xs text-[#F8F9FA] transition-colors cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#C19A6B]" />
            Back to Archive
          </button>
          <div>
            <div className="text-[11px] font-mono text-[#C19A6B] uppercase tracking-widest flex items-center gap-2">
              <span>Verified Broadcast Program Library</span>
            </div>
            <h1 className="text-2xl font-black font-serif text-[#F8F9FA] tracking-tight">
              {programName.toUpperCase()}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#243548] border border-[#33475B] px-3 py-1.5 rounded-xl text-xs font-mono text-[#94A3B8]">
          <Calendar className="w-4 h-4 text-[#C19A6B]" />
          <span>{dateStr}</span>
        </div>
      </div>

      {/* Program Summary Card */}
      <div className="bg-[#243548] border border-[#33475B] rounded-2xl p-6 mb-8 shadow-xl flex flex-col md:flex-row gap-6 items-start justify-between">
        <div className="space-y-3 max-w-2xl">
          <h3 className="text-lg font-bold font-serif text-[#F8F9FA]">Broadcast Series Overview</h3>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Comprehensive historical and educational media archive for <strong className="text-[#F8F9FA]">{programName}</strong>. All hours and segments are normalized, verified for cryptographic checksum integrity, and mapped with strict date compliance.
          </p>
          <div className="flex items-center gap-4 text-xs font-mono text-[#C19A6B] pt-2">
            <span className="flex items-center gap-1.5">
              <Film className="w-4 h-4" />
              {programRecords.length} Available Recordings ({startIndex + 1}–{Math.min(startIndex + itemsPerPage, programRecords.length)} shown)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              Data Integrity Verified
            </span>
          </div>
        </div>

        <div className="bg-[#1C2B3A] border border-[#33475B] rounded-xl p-4 w-full md:w-72 space-y-2">
          <div className="text-[11px] font-mono text-[#94A3B8] uppercase">Quick Action</div>
          {programRecords.length > 0 && (
            <button
              onClick={() => onSelectRecord(programRecords[0])}
              className="w-full flex items-center justify-center gap-2 bg-[#C19A6B] hover:bg-[#b0885a] text-[#1C2B3A] px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              Play Latest Segment
            </button>
          )}
        </div>
      </div>

      {/* Available Segments Grid */}
      <div className="space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-serif uppercase tracking-widest text-[#C19A6B]">
              Segments & Recordings (Page {currentPage} of {totalPages})
            </h3>
            <span className="text-xs font-mono text-[#94A3B8]">
              Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPage, programRecords.length)} of {programRecords.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentRecords.map((record) => {
              const isActive = activeRecord?.id === record.id;
              const isAudio = record.mediaType === 'audio';
              return (
                <div
                  key={record.id}
                  onClick={() => onSelectRecord(record)}
                  className={`
                    p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-4
                    ${isActive 
                      ? 'bg-[#2E445D] border-[#C19A6B] shadow-glow ring-1 ring-[#C19A6B]' 
                      : 'bg-[#243548] border-[#33475B] hover:border-[#4A637C] hover:bg-[#2A3D52]'}
                  `}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded border ${isAudio ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-[#C19A6B]/10 text-[#C19A6B] border-[#C19A6B]/30'}`}>
                        {isAudio ? <Headphones className="w-3 h-3 inline mr-1" /> : <Film className="w-3 h-3 inline mr-1" />}
                        {record.mediaType.toUpperCase()} • {record.segment || 'Segment'}
                      </span>
                      {isActive && (
                        <span className="bg-[#C19A6B] text-[#1C2B3A] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider animate-pulse">
                          Active
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-[#F8F9FA] line-clamp-2">{record.title}</h4>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#33475B] text-xs font-mono text-[#94A3B8]">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#C19A6B]" />
                      60 Mins
                    </span>
                    <button className={`
                      flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer
                      ${isActive ? 'bg-[#C19A6B] text-[#1C2B3A]' : 'bg-[#1C2B3A] text-[#F8F9FA] hover:bg-[#C19A6B] hover:text-[#1C2B3A]'}
                    `}>
                      <Play className="w-3 h-3 fill-current" />
                      Play
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6 pb-2 border-t border-[#33475B] mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3.5 py-2 rounded-xl bg-[#243548] hover:bg-[#2E445D] disabled:opacity-40 border border-[#33475B] text-xs font-mono text-[#F8F9FA] cursor-pointer"
            >
              ‹ Previous
            </button>
            
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-9 h-9 rounded-xl font-mono text-xs font-bold cursor-pointer transition-all ${currentPage === pageNum ? 'bg-[#C19A6B] text-[#1C2B3A] shadow-md' : 'bg-[#243548] hover:bg-[#2E445D] text-[#94A3B8] border border-[#33475B]'}`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3.5 py-2 rounded-xl bg-[#243548] hover:bg-[#2E445D] disabled:opacity-40 border border-[#33475B] text-xs font-mono text-[#F8F9FA] cursor-pointer"
            >
              Next ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
