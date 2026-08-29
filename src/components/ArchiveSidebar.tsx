/**
 * Archive Sidebar Component
 * Hierarchical tree navigation: Year -> Month -> Day -> Program -> Records
 * featuring media-type indicators (Video / Audio).
 */

import React, { useState } from 'react';
import { ArchiveMediaRecord } from '../types';
import { ChevronRight, ChevronDown, Calendar, Folder, Play, Search, Film, Headphones } from 'lucide-react';

interface ArchiveSidebarProps {
  records: ArchiveMediaRecord[];
  activeRecord: ArchiveMediaRecord | null;
  onSelectRecord: (record: ArchiveMediaRecord) => void;
  onSelectProgram: (programName: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export function ArchiveSidebar({
  records,
  activeRecord,
  onSelectRecord,
  onSelectProgram,
  searchTerm,
  onSearchChange,
  isOpen,
  onCloseMobile,
}: ArchiveSidebarProps) {
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({ '2026': true });
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({ '2026-August': true });
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({ '2026-08-28': true, '2026-08-27': true });
  const [expandedPrograms, setExpandedPrograms] = useState<Record<string, boolean>>({ 'War Room': true, 'Alex Jones Show': true, 'Research Interview': true });

  const toggleYear = (y: string) => setExpandedYears(prev => ({ ...prev, [y]: !prev[y] }));
  const toggleMonth = (m: string) => setExpandedMonths(prev => ({ ...prev, [m]: !prev[m] }));
  const toggleDay = (d: string) => setExpandedDays(prev => ({ ...prev, [d]: !prev[d] }));
  const toggleProgram = (p: string) => setExpandedPrograms(prev => ({ ...prev, [p]: !prev[p] }));

  const hierarchy: Record<string, Record<string, Record<string, Record<string, ArchiveMediaRecord[]>>>> = {};

  const filteredRecords = records.filter(r => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (
      r.title.toLowerCase().includes(t) ||
      r.program.toLowerCase().includes(t) ||
      r.filename.toLowerCase().includes(t) ||
      r.date.includes(t)
    );
  });

  for (const r of filteredRecords) {
    if (r.status === 'invalid') continue;
    const year = r.date.substring(0, 4) || '2026';
    const monthNum = r.date.substring(5, 7) || '08';
    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1, 1).toLocaleString('default', { month: 'long' });
    const dayKey = r.date;
    const prog = r.program || 'General Program';

    if (!hierarchy[year]) hierarchy[year] = {};
    if (!hierarchy[year][monthName]) hierarchy[year][monthName] = {};
    if (!hierarchy[year][monthName][dayKey]) hierarchy[year][monthName][dayKey] = {};
    if (!hierarchy[year][monthName][dayKey][prog]) hierarchy[year][monthName][dayKey][prog] = [];

    hierarchy[year][monthName][dayKey][prog].push(r);
  }

  return (
    <>
      {isOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs"
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-80 bg-[#1C2B3A] border-r border-[#33475B]
        flex flex-col transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Search Header */}
        <div className="p-4 border-b border-[#33475B] bg-[#16222F]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#4A637C]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search archive library..."
              className="w-full bg-[#243548] border border-[#33475B] rounded-lg pl-9 pr-3 py-2 text-xs text-[#F8F9FA] placeholder-[#4A637C] focus:outline-none focus:border-[#C19A6B]"
            />
          </div>
        </div>

        {/* Tree Navigation Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-sm">
          <div className="text-[11px] font-mono tracking-widest text-[#C19A6B] uppercase mb-2 px-1">
            Archive Directory Library
          </div>

          {Object.keys(hierarchy).length === 0 ? (
            <div className="text-xs text-[#94A3B8] p-4 text-center">
              No matching records found.
            </div>
          ) : (
            Object.entries(hierarchy).map(([year, months]) => {
              const isYearExpanded = expandedYears[year] ?? true;
              return (
                <div key={year} className="space-y-1">
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#243548] text-[#F8F9FA] font-serif font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-[#C19A6B]" />
                      {year}
                    </span>
                    {isYearExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />}
                  </button>

                  {isYearExpanded && (
                    <div className="pl-3 space-y-1 border-l border-[#33475B] ml-2">
                      {Object.entries(months).map(([monthName, days]) => {
                        const monthKey = `${year}-${monthName}`;
                        const isMonthExpanded = expandedMonths[monthKey] ?? true;
                        return (
                          <div key={monthName} className="space-y-1">
                            <button
                              onClick={() => toggleMonth(monthKey)}
                              className="w-full flex items-center justify-between p-1.5 rounded-md hover:bg-[#243548] text-[#F8F9FA] text-xs transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-[#4A637C]" />
                                {monthName}
                              </span>
                              {isMonthExpanded ? <ChevronDown className="w-3 h-3 text-[#94A3B8]" /> : <ChevronRight className="w-3 h-3 text-[#94A3B8]" />}
                            </button>

                            {isMonthExpanded && (
                              <div className="pl-3 space-y-1 border-l border-[#33475B]/60 ml-2">
                                {Object.entries(days).map(([dayKey, programs]) => {
                                  const isDayExpanded = expandedDays[dayKey] ?? true;
                                  const formattedDateLabel = new Date(dayKey + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                                  return (
                                    <div key={dayKey} className="space-y-1">
                                      <button
                                        onClick={() => toggleDay(dayKey)}
                                        className="w-full flex items-center justify-between p-1.5 rounded-md hover:bg-[#243548] text-[#94A3B8] text-xs font-mono transition-colors cursor-pointer"
                                      >
                                        <span className="truncate">{formattedDateLabel}</span>
                                        {isDayExpanded ? <ChevronDown className="w-3 h-3 text-[#94A3B8]" /> : <ChevronRight className="w-3 h-3 text-[#94A3B8]" />}
                                      </button>

                                      {isDayExpanded && (
                                        <div className="pl-3 space-y-1 border-l border-[#33475B]/40 ml-2">
                                          {Object.entries(programs).map(([progName, segs]) => {
                                            const isProgExpanded = expandedPrograms[progName] ?? true;
                                            return (
                                              <div key={progName} className="space-y-1">
                                                <button
                                                  onClick={() => {
                                                    toggleProgram(progName);
                                                    onSelectProgram(progName);
                                                  }}
                                                  className="w-full flex items-center justify-between p-1.5 rounded-md hover:bg-[#243548] text-[#F8F9FA] text-xs font-semibold font-serif transition-colors cursor-pointer"
                                                >
                                                  <span className="text-[#C19A6B]">{progName}</span>
                                                  {isProgExpanded ? <ChevronDown className="w-3 h-3 text-[#94A3B8]" /> : <ChevronRight className="w-3 h-3 text-[#94A3B8]" />}
                                                </button>

                                                {isProgExpanded && (
                                                  <div className="pl-3 space-y-1 border-l border-[#C19A6B]/30 ml-2">
                                                    {segs.map(record => {
                                                      const isActive = activeRecord?.id === record.id;
                                                      const isAudio = record.mediaType === 'audio';
                                                      return (
                                                        <button
                                                          key={record.id}
                                                          onClick={() => {
                                                            onSelectRecord(record);
                                                            if (window.innerWidth < 768) onCloseMobile();
                                                          }}
                                                          className={`
                                                            w-full flex items-center justify-between p-1.5 rounded-md text-xs text-left transition-all cursor-pointer
                                                            ${isActive 
                                                              ? 'bg-[#C19A6B]/20 text-[#C19A6B] border border-[#C19A6B]/40 font-semibold shadow-xs' 
                                                              : 'text-[#94A3B8] hover:bg-[#243548] hover:text-[#F8F9FA]'}
                                                          `}
                                                        >
                                                          <span className="flex items-center gap-1.5 truncate">
                                                            {isAudio ? <Headphones className="w-3 h-3 text-red-400 shrink-0" /> : <Film className="w-3 h-3 text-[#C19A6B] shrink-0" />}
                                                            <span className="truncate">{record.segment || 'Segment'}</span>
                                                          </span>
                                                          {isActive && <Play className="w-3 h-3 text-[#C19A6B] fill-[#C19A6B] shrink-0" />}
                                                        </button>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-[#33475B] bg-[#16222F] text-[10px] font-mono text-[#94A3B8] flex justify-between items-center">
          <span>ARCHIVE LIB: v2.5</span>
          <span className="text-[#C19A6B]">{records.length} Records</span>
        </div>
      </aside>
    </>
  );
}
