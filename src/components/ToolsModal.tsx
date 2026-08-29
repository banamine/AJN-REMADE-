/**
 * Tools Modal Component
 * Manages HTML Source Import (with validation and summary statistics) and Diagnostics access.
 */

import React, { useState } from 'react';
import { ImportResultSummary, ArchiveMediaRecord } from '../types';
import { ArchiveManager } from '../services/ArchiveManager';
import { MediaAssetManager } from './MediaAssetManager';
import { Wrench, FileCode, CheckCircle, AlertTriangle, ShieldCheck, X, RefreshCw, Database } from 'lucide-react';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingRecords: ArchiveMediaRecord[];
  onImportSuccess: (newRecords: ArchiveMediaRecord[]) => void;
  onOpenDiagnostics: () => void;
}

export function ToolsModal({
  isOpen,
  onClose,
  existingRecords,
  onImportSuccess,
  onOpenDiagnostics,
}: ToolsModalProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'assets' | 'diagnostics'>('import');
  const [htmlInput, setHtmlInput] = useState<string>('');
  const [importResult, setImportResult] = useState<ImportResultSummary | null>(null);
  const [importing, setImporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleRunImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!htmlInput.trim()) return;
    setImporting(true);

    try {
      const summary = ArchiveManager.importFromHtmlOrText(htmlInput, existingRecords);
      setImportResult(summary);
      if (summary.records.length > 0) {
        onImportSuccess(summary.records);
      }
    } catch (err) {
      console.error('Import error:', err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#1C2B3A] border border-[#33475B] rounded-2xl w-full max-w-4xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#33475B] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C19A6B]/20 border border-[#C19A6B]/40 flex items-center justify-center text-[#C19A6B]">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif text-[#F8F9FA]">Archive Administrative & Database Console</h2>
              <p className="text-xs text-[#94A3B8]">HTML Source Ingestion, Database Assets & System Diagnostics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-[#243548] hover:bg-[#2E445D] text-[#94A3B8] hover:text-[#F8F9FA] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-[#16222F] border border-[#33475B] p-1 rounded-xl mb-4 shrink-0">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'import' ? 'bg-[#C19A6B] text-[#1C2B3A] shadow-md' : 'text-[#94A3B8] hover:text-[#F8F9FA]'}`}
          >
            Import HTML Source
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'assets' ? 'bg-[#C19A6B] text-[#1C2B3A] shadow-md' : 'text-[#94A3B8] hover:text-[#F8F9FA]'}`}
          >
            Database Asset Manager
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenDiagnostics();
            }}
            className="flex-1 py-2 rounded-lg text-xs font-semibold text-[#94A3B8] hover:text-[#F8F9FA] transition-colors cursor-pointer"
          >
            System Diagnostics
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'import' && (
            <div className="space-y-4 p-2">
              {!importResult ? (
                <form onSubmit={handleRunImport} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#F8F9FA] mb-1">
                      Paste HTML Source Code or Media Filename List
                    </label>
                    <p className="text-[11px] text-[#94A3B8] mb-2">
                      Our normalization engine will parse filenames (e.g. <code className="text-[#C19A6B]">20260828_Fri_NASAArchive-Hour1.m4v</code>), verify mathematical date integrity, and filter duplicates.
                    </p>
                    <textarea
                      rows={8}
                      required
                      value={htmlInput}
                      onChange={(e) => setHtmlInput(e.target.value)}
                      placeholder='<a href="20260828_Fri_NASAArchive-Hour1.m4v">NASA Archive Hour 1</a>'
                      className="w-full bg-[#243548] border border-[#33475B] rounded-xl p-3 text-xs font-mono text-[#F8F9FA] placeholder-[#4A637C] focus:outline-none focus:border-[#C19A6B]"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl bg-[#243548] hover:bg-[#2E445D] text-[#94A3B8] text-xs font-medium transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={importing}
                      className="px-5 py-2 rounded-xl bg-[#C19A6B] hover:bg-[#b0885a] text-[#1C2B3A] text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
                    >
                      {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileCode className="w-3.5 h-3.5" />}
                      Load & Extract Videos
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 bg-[#243548] border border-[#33475B] rounded-xl p-5">
                  <h3 className="text-base font-bold font-serif text-[#F8F9FA]">Import Complete</h3>
                  <p className="text-xs text-[#94A3B8]">
                    {importResult.totalDiscovered} media records discovered and normalized against cryptographic date rules.
                  </p>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1C2B3A] border border-[#33475B] text-emerald-400">
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Valid Records Ready
                      </span>
                      <strong className="text-white">{importResult.validCount}</strong>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1C2B3A] border border-[#33475B] text-amber-400">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Duplicates Filtered
                      </span>
                      <strong className="text-white">{importResult.duplicateCount}</strong>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1C2B3A] border border-[#33475B] text-red-400">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Invalid Dates / Integrity Errors
                      </span>
                      <strong className="text-white">{importResult.invalidDateCount}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      onClick={() => setImportResult(null)}
                      className="px-4 py-2 rounded-xl bg-[#1C2B3A] hover:bg-[#16222F] text-[#94A3B8] text-xs font-medium transition-colors cursor-pointer border border-[#33475B]"
                    >
                      Import More
                    </button>
                    <button
                      onClick={onClose}
                      className="px-5 py-2 rounded-xl bg-[#C19A6B] hover:bg-[#b0885a] text-[#1C2B3A] text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      View Archive
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'assets' && (
            <div className="h-[500px] overflow-hidden flex flex-col rounded-xl border border-[#33475B] bg-[#16222F]">
              <MediaAssetManager />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
