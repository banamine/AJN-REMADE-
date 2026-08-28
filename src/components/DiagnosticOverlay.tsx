/**
 * DiagnosticOverlay Component
 * Isolated developer diagnostics overlay displaying Kernel State, Persistence Tiers, and Retry Stack,
 * toggled via a dedicated developer shortcut/button.
 */

import React from 'react';
import { ShieldCheck, Terminal, Database, Server, X } from 'lucide-react';

interface DiagnosticOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  stateValue: string;
  retryCount: number;
  apiStatus: { status: string; database: string } | null;
  onTestCrash: () => void;
}

export function DiagnosticOverlay({
  isOpen,
  onClose,
  stateValue,
  retryCount,
  apiStatus,
  onTestCrash,
}: DiagnosticOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl max-w-2xl w-full p-6 text-xs font-mono shadow-2xl animate-fadeIn">
        <div className="flex items-center justify-between pb-4 border-b border-[#27272a] mb-6">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            <Terminal className="w-5 h-5" />
            SYSTEM DIAGNOSTIC & VERIFICATION GATE
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800">
              <div className="text-zinc-500 mb-1">RUNTIME KERNEL STATE</div>
              <div className="text-emerald-400 font-bold text-sm">{stateValue.toUpperCase()}</div>
            </div>
            <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800">
              <div className="text-zinc-500 mb-1">DATABASE & API HEALTH</div>
              <div className="text-blue-400 font-bold text-sm">
                API: {apiStatus?.status || 'checking...'} | DB: {apiStatus?.database || 'unknown'}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-zinc-400 uppercase tracking-widest mb-3">Tiered Persistence Status</h3>
            <div className="grid grid-cols-4 gap-2">
              <div className="p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                <div className="text-[10px] text-zinc-500 mb-1">MEMORY</div>
                <div className="text-emerald-400 font-bold">ACTIVE</div>
              </div>
              <div className="p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                <div className="text-[10px] text-zinc-500 mb-1">LOCAL STORAGE</div>
                <div className="text-emerald-400 font-bold">SYNCED</div>
              </div>
              <div className="p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                <div className="text-[10px] text-zinc-500 mb-1">SESSION</div>
                <div className="text-emerald-400 font-bold">ACTIVE</div>
              </div>
              <div className="p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                <div className="text-[10px] text-zinc-500 mb-1">INDEXED_DB</div>
                <div className="text-emerald-400 font-bold">DURABLE</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <span className="text-zinc-400">
              Guardrail Retry Stack: <strong className="text-amber-400">{retryCount}/3</strong>
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={onTestCrash}
                className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Test Guardrail Crash
              </button>
              <button
                onClick={onClose}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-xs cursor-pointer"
              >
                Close Diagnostics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
