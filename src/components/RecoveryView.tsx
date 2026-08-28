/**
 * Recovery View & Guardrail Engine Toast
 * Enforces No Blank Screen Invariant by auto-healing to GUIDE after playback failure threshold.
 */

import React from 'react';
import { ShieldAlert, RefreshCw, Compass } from 'lucide-react';

interface RecoveryViewProps {
  error: string | null;
  onReturnToGuide: () => void;
}

export function RecoveryView({ error, onReturnToGuide }: RecoveryViewProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-background text-textMain p-6">
      <div className="max-w-md w-full bg-surface border border-borderSubtle rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 bg-red-900/40 border border-red-700/80 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-400">
          <ShieldAlert className="w-8 h-8 animate-pulse" />
        </div>

        <h2 className="text-xl font-bold tracking-tight mb-2 text-textMain">
          UX Guardrail Engine Triggered
        </h2>
        <p className="text-sm text-textMuted mb-6 leading-relaxed">
          Playback failed repeatedly (Exceeded 3 retry attempts). To uphold the <strong className="text-primary">No Blank Screen Invariant</strong>, the kernel has safely auto-healed the broadcast session.
        </p>

        {error && (
          <div className="bg-red-900/80 border border-red-500 text-red-100 px-4 py-3 rounded backdrop-blur-sm text-xs font-mono mb-6 text-left break-all shadow-glow">
            <strong>Error:</strong> {error}
          </div>
        )}

        <button
          onClick={onReturnToGuide}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-glow cursor-pointer"
        >
          <Compass className="w-5 h-5" />
          Return to Broadcast Guide
        </button>
      </div>
    </div>
  );
}
