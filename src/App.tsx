/**
 * AJN Liberty Play - Main Application Entry
 * Integrates XState v5 UX Runtime Kernel, Tiered Persistence Facade, Broadcast TV Guide, and Playback Surface.
 * Diagnostics isolated via DiagnosticOverlay.
 */

import React, { useEffect, useState } from 'react';
import { useMachine } from '@xstate/react';
import { uxKernelMachine } from './kernel/uxKernelMachine';
import { persistenceFacade } from './kernel/KernelPersistenceFacade';
import { BroadcastGuide } from './components/BroadcastGuide';
import { PlaybackSurface } from './components/PlaybackSurface';
import { RecoveryView } from './components/RecoveryView';
import { DiagnosticOverlay } from './components/DiagnosticOverlay';
import { ProgramSchedule, Channel } from './types';
import { ShieldCheck, Terminal, Tv } from 'lucide-react';

export default function App() {
  const [state, send] = useMachine(uxKernelMachine);
  const [apiStatus, setApiStatus] = useState<{ status: string; database: string } | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // Boot sequence: dynamic session verification via IndexedDB
  useEffect(() => {
    async function bootKernel() {
      try {
        const { sessionActive, cache } = await persistenceFacade.verifyDynamicSession();
        console.log('Kernel Boot: Dynamic Session Verification complete. Active:', sessionActive, cache);
        
        // Check API health
        try {
          const res = await fetch('/healthz');
          const data = await res.json();
          setApiStatus(data);
        } catch {
          setApiStatus({ status: 'offline', database: 'unreachable' });
        }

        // Complete boot and transition to GUIDE
        send({ type: 'BOOT_COMPLETE', sessionActive });
      } catch (err) {
        console.error('Boot verification error:', err);
        send({ type: 'FATAL_CRASH', error: (err as Error).message });
      }
    }

    bootKernel();
  }, [send]);

  const handleSelectProgram = (program: ProgramSchedule, channel: Channel) => {
    send({ type: 'START_PLAYBACK', program, channel });
  };

  const handleBackToGuide = () => {
    send({ type: 'NAVIGATE_GUIDE' });
  };

  const handlePlayError = (errorMsg: string) => {
    send({ type: 'PLAY_ERROR', error: errorMsg });
  };

  const handleHealRecovery = () => {
    send({ type: 'HEAL_RECOVERY' });
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0B0F19] text-[#F3F4F6] overflow-hidden font-sans">
      {/* App Chrome Header */}
      <header className="app-chrome">
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold tracking-tighter text-white flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-mono text-sm">LP</span>
            AJN LIBERTY PLAY
          </span>
          <span className="text-xs font-mono text-zinc-500 opacity-75">v1.0.0-PROD</span>
        </div>
        <div className="kernel-status">
          <span className="text-zinc-500">KERNEL_STATE:</span>
          <div className="status-pill">{state.value.toString().toUpperCase()}</div>
          <button
            onClick={() => setShowDiagnostics(true)}
            className="flex items-center gap-1.5 ml-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1 rounded-full text-xs font-mono transition-colors text-blue-400 cursor-pointer shadow"
          >
            <div className={`h-2 w-2 rounded-full ${apiStatus?.database === 'connected' ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`}></div>
            <span className="hidden sm:inline">Diagnostics ({apiStatus?.database || 'checking...'})</span>
            <span className="sm:hidden">Diag</span>
          </button>
        </div>
      </header>

      {/* Isolated Diagnostic Overlay */}
      <DiagnosticOverlay
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
        stateValue={state.value.toString()}
        retryCount={state.context.retryCount}
        apiStatus={apiStatus}
        onTestCrash={() => {
          setShowDiagnostics(false);
          send({ type: 'FATAL_CRASH', error: 'Manual test crash triggered from diagnostics overlay' });
        }}
      />

      {/* Main Viewport Clean Content Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {state.matches('BOOT') && (
          <div className="flex flex-col items-center justify-center h-full bg-[#0B0F19]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="font-mono text-sm text-primary tracking-wider">BOOTING UX RUNTIME KERNEL & SESSION...</p>
            </div>
          </div>
        )}

        {(state.matches('HOME') || state.matches('GUIDE')) && (
          <BroadcastGuide onSelectProgram={handleSelectProgram} />
        )}

        {state.matches('PLAYBACK') && (
          <div className="h-full w-full flex flex-col bg-black overflow-hidden">
            <PlaybackSurface
              program={state.context.activeProgram || { id: 1, channel_id: 1, title: 'Live Stream', start_time: new Date().toISOString(), end_time: new Date().toISOString(), media_url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8', duration_seconds: 3600, timezone: 'UTC' }}
              channel={state.context.activeChannel}
              retryCount={state.context.retryCount}
              onBackToGuide={handleBackToGuide}
              onPlayError={handlePlayError}
            />
          </div>
        )}

        {state.matches('RECOVERY') && (
          <div className="h-full w-full flex items-center justify-center">
            <RecoveryView
              error={state.context.activeError}
              onReturnToGuide={handleHealRecovery}
            />
          </div>
        )}
      </main>

      {/* Footer Bar */}
      <footer className="footer-bar">
        <div>Broadcast OS Kernel: <span className="text-zinc-300 font-mono">xstate@5.1.0</span></div>
        <div className="flex gap-4">
          <span>PostgreSQL Authoritative Engine</span>
          <span className="text-primary font-bold uppercase">Data Integrity Pass Active</span>
        </div>
      </footer>
    </div>
  );
}
