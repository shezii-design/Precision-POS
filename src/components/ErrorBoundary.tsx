import React, { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export class ErrorBoundary extends (React.Component as any)<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetLocalSession = () => {
    try {
      // Clear temporary session data but preserve secure authentication state
      sessionStorage.clear();
      const authKey = 'kfh_inventory_auth_state_v1';
      const raw = localStorage.getItem(authKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          // Keep lock active for security
          parsed.isLocked = true;
          localStorage.setItem(authKey, JSON.stringify(parsed));
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
    window.location.reload();
  };

  private handleHardReset = () => {
    if (window.confirm('Are you sure? This will reset local session preferences and reload.')) {
      try {
        sessionStorage.clear();
        const keepKeys = ['kfh_inventory_products_v1', 'kfh_inventory_sales_v1', 'kfh_inventory_customers_v1'];
        const savedData: Record<string, string | null> = {};
        keepKeys.forEach(k => {
          savedData[k] = localStorage.getItem(k);
        });
        localStorage.clear();
        Object.entries(savedData).forEach(([k, v]) => {
          if (v) localStorage.setItem(k, v);
        });
      } catch {
        // ignore
      }
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white">Application Encountered an Issue</h1>
                <p className="text-xs text-slate-400">The application caught an unexpected error.</p>
              </div>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-700/60 font-mono text-xs text-red-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
              {this.state.error?.message || 'Unknown runtime exception'}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-600/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetLocalSession}
                className="py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Clean Session & Reload</span>
              </button>
            </div>

            <div className="border-t border-slate-700 pt-4 flex justify-between items-center text-xs text-slate-500">
              <span>PrecisionPOS Self-Recovery</span>
              <button
                type="button"
                onClick={this.handleHardReset}
                className="text-slate-400 hover:text-red-400 underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Local Session
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface SectionProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  key?: React.Key;
}

interface SectionState {
  hasError: boolean;
  errorMessage: string;
}

export class SectionErrorBoundary extends (React.Component as any)<SectionProps, SectionState> {
  constructor(props: SectionProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  public static getDerivedStateFromError(error: Error): SectionState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Component failed to load',
    };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error('Section Error caught:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50/80 border border-red-200 rounded-2xl text-center space-y-3 my-4">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-red-900">
            {this.props.fallbackTitle || 'Unable to display this section'}
          </h3>
          <p className="text-xs text-red-700 max-w-md mx-auto font-mono">
            {this.state.errorMessage}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
