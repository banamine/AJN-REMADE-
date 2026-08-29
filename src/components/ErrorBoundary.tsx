/**
 * Error Boundary Component
 * Catches render errors across subsystems (Player, Archive, App) and displays
 * a clean, institutional recovery interface with retry and reset triggers.
 */

import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as any) {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '#home';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-6 bg-[#1C2B3A] text-[#F8F9FA] min-h-screen">
          <div className="bg-[#243548] border border-[#33475B] rounded-2xl p-8 max-w-lg w-full text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold font-serif text-white">
                {this.props.fallbackTitle || 'Subsystem Exception Encountered'}
              </h2>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                The archive component or media playback surface encountered an unexpected runtime exception. The isolated state has been preserved.
              </p>
              {this.state.error && (
                <div className="mt-4 p-3 rounded-lg bg-[#16222F] border border-[#33475B] text-xs font-mono text-red-300 text-left overflow-x-auto max-h-32">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 bg-[#2E445D] hover:bg-[#385270] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                <RotateCcw className="w-4 h-4" />
                Retry Component
              </button>
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 bg-[#C19A6B] hover:bg-[#b0885a] text-[#1C2B3A] px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                <Home className="w-4 h-4" />
                Return to Archive Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
