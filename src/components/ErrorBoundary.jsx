import React from "react";

// Top-level error boundary — catches any render crash in the app tree and
// shows the actual error + stack trace instead of a blank white page.
// Without this, a single component throwing during render unmounts the
// entire React tree and the user sees nothing.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-lg w-full space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The page hit an unexpected error. Try reloading — if it keeps happening, contact support.
            </p>
            {this.state.error && (
              <div className="bg-secondary border border-border rounded-xl p-4 overflow-auto max-h-[300px]">
                <p className="text-xs font-mono text-destructive font-semibold mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
                {this.state.error?.stack && (
                  <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap mt-2">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-hover transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}