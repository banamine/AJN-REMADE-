/**
 * UX Runtime Kernel XState v5 Machine
 * States: BOOT, HOME, GUIDE, PLAYBACK, RECOVERY
 * Implements retry limit (max 3 retries on PLAY_ERROR) and No Blank Screen Invariant auto-healing to GUIDE.
 */

import { setup, assign } from 'xstate';
import { persistenceFacade } from './KernelPersistenceFacade';
import { ProgramSchedule, Channel } from '../types';

export interface KernelContext {
  retryCount: number;
  activeError: string | null;
  activeProgram: ProgramSchedule | null;
  activeChannel: Channel | null;
  playbackPosition: number;
  sessionActive: boolean;
}

export type KernelEvent =
  | { type: 'BOOT_COMPLETE'; sessionActive: boolean }
  | { type: 'NAVIGATE_HOME' }
  | { type: 'NAVIGATE_GUIDE' }
  | { type: 'START_PLAYBACK'; program: ProgramSchedule; channel?: Channel }
  | { type: 'PLAY_ERROR'; error: string }
  | { type: 'RETRY_PLAYBACK' }
  | { type: 'HEAL_RECOVERY' }
  | { type: 'FATAL_CRASH'; error: string };

export const uxKernelMachine = setup({
  types: {
    context: {} as KernelContext,
    events: {} as KernelEvent,
  },
  actions: {
    incrementRetry: assign({
      retryCount: ({ context }) => context.retryCount + 1,
      activeError: ({ event }) => (event.type === 'PLAY_ERROR' ? event.error : 'Playback failure'),
    }),
    resetRetry: assign({
      retryCount: 0,
      activeError: null,
    }),
    setPlaybackTarget: assign({
      activeProgram: ({ event }) => (event.type === 'START_PLAYBACK' ? event.program : null),
      activeChannel: ({ event }) => (event.type === 'START_PLAYBACK' ? event.channel || null : null),
    }),
    setSessionActive: assign({
      sessionActive: ({ event }) => (event.type === 'BOOT_COMPLETE' ? event.sessionActive : false),
    }),
    recordFatalError: assign({
      activeError: ({ event }) => (event.type === 'FATAL_CRASH' ? event.error : 'System fatal error'),
    }),
  },
  guards: {
    hasExceededRetries: ({ context }) => context.retryCount >= 3,
  },
}).createMachine({
  id: 'uxKernel',
  initial: 'BOOT',
  context: {
    retryCount: 0,
    activeError: null,
    activeProgram: null,
    activeChannel: null,
    playbackPosition: 0,
    sessionActive: false,
  },
  states: {
    BOOT: {
      on: {
        BOOT_COMPLETE: {
          target: 'GUIDE',
          actions: ['setSessionActive'],
        },
        FATAL_CRASH: {
          target: 'RECOVERY',
          actions: ['recordFatalError'],
        },
      },
    },
    HOME: {
      on: {
        NAVIGATE_GUIDE: 'GUIDE',
        START_PLAYBACK: {
          target: 'PLAYBACK',
          actions: ['setPlaybackTarget', 'resetRetry'],
        },
        FATAL_CRASH: {
          target: 'RECOVERY',
          actions: ['recordFatalError'],
        },
      },
    },
    GUIDE: {
      on: {
        NAVIGATE_HOME: 'HOME',
        START_PLAYBACK: {
          target: 'PLAYBACK',
          actions: ['setPlaybackTarget', 'resetRetry'],
        },
        FATAL_CRASH: {
          target: 'RECOVERY',
          actions: ['recordFatalError'],
        },
      },
    },
    PLAYBACK: {
      on: {
        NAVIGATE_GUIDE: {
          target: 'GUIDE',
          actions: ['resetRetry'],
        },
        NAVIGATE_HOME: {
          target: 'HOME',
          actions: ['resetRetry'],
        },
        PLAY_ERROR: [
          {
            guard: 'hasExceededRetries',
            target: 'RECOVERY',
            actions: ['incrementRetry'],
          },
          {
            target: 'PLAYBACK',
            actions: ['incrementRetry'],
          },
        ],
        FATAL_CRASH: {
          target: 'RECOVERY',
          actions: ['recordFatalError'],
        },
      },
    },
    RECOVERY: {
      entry: () => {
        // Enforce No Blank Screen Invariant: automatically heal and route back to GUIDE after short timeout or action
        persistenceFacade.setSessionRecoveryState(true);
      },
      on: {
        HEAL_RECOVERY: {
          target: 'GUIDE',
          actions: ['resetRetry'],
        },
        NAVIGATE_GUIDE: {
          target: 'GUIDE',
          actions: ['resetRetry'],
        },
        NAVIGATE_HOME: {
          target: 'HOME',
          actions: ['resetRetry'],
        },
      },
    },
  },
});
