import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error?: Error;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Implementation Inspector panel crashed.', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="min-h-screen bg-canvas p-6 text-ink">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-6 shadow-panel">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-red-700">
            Inspector runtime error
          </p>
          <h1 className="mt-2 text-xl font-semibold">The panel could not finish rendering</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Reload the extension and inspected page. If this persists, copy the error below for the
            QA report.
          </p>
          <pre className="mt-4 overflow-auto rounded-lg bg-stone-100 p-3 text-xs text-red-900">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-oracle px-4 py-2 text-sm font-semibold text-white"
          >
            Reload inspector panel
          </button>
        </div>
      </main>
    );
  }
}
