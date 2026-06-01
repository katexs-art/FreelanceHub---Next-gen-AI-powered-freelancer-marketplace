import { Component, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("ErrorBoundary caught:", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full bg-background border border-border rounded-2xl p-8 text-center">
          <h1 className="text-lg font-semibold mb-1">Something went wrong</h1>
          <p className="text-sm text-foreground-muted mb-5 break-words">
            {this.state.error.message || "An unexpected error occurred."}
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={this.reset}
              className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90"
            >
              Try again
            </button>
            <a
              href="/"
              className="px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-background-elevated"
            >
              Back to home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
