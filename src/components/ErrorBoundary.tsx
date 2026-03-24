import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; message: string; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Unknown error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CivicPath] Unhandled error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">⚡</div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">Something went wrong</h1>
          <p className="text-stone-500 text-sm mb-6 leading-relaxed">
            CivicPath hit an unexpected error. Your data is safe — this is a display issue only.
          </p>
          <div className="bg-stone-50 rounded-xl p-3 mb-6 text-left">
            <p className="text-xs font-mono text-red-600 break-all">{this.state.message}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-[#76B900] text-[#111111] font-bold rounded-xl hover:bg-[#689900] transition-colors"
          >
            Reload CivicPath
          </button>
          <a href="/" className="block mt-3 text-sm text-stone-400 hover:text-stone-600 underline">
            Go to Home
          </a>
        </div>
      </div>
    );
  }
}
