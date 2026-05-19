"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[200px] items-center justify-center p-6 text-center">
            <div className="space-y-2">
              <p className="text-sm text-rose-400">Something went wrong.</p>
              <button
                type="button"
                onClick={() => this.setState({ error: null })}
                className="text-xs text-white/50 underline underline-offset-2 hover:text-white/70"
              >
                Try again
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
