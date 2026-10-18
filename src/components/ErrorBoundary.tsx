import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Uncaught UI error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#fbf7f0] text-[#292222] flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-white p-8 rounded-2xl shadow-xl border border-[#eadfda] space-y-4">
            <h1 className="font-serif text-2xl text-[#70283b] font-bold">
              Indian Ishq Collection
            </h1>
            <p className="text-sm text-[#776c6b]">
              We are refreshing your boutique collection. Click below to reload.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="px-6 py-2.5 bg-[#70283b] text-white text-xs font-semibold uppercase tracking-wider rounded-lg shadow-sm hover:bg-[#4c1727] cursor-pointer"
            >
              Reload Store
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
