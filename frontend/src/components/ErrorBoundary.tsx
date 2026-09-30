'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  showStack: boolean;
}

/**
 * Wave 4: Error boundary reskinned as calm diagnostic dispatch card.
 * Oxide-risk indicators, hairline borders, collapsible stack trace,
 * no glow or dark theme effects.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, showStack: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showStack: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[NexaFreight] ${this.props.name || 'Component'} Error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-dispatch">
          <div className="error-dispatch__header">
            {this.props.name?.toUpperCase() || 'COMPONENT'} ERROR
          </div>
          <div className="error-dispatch__message">
            {this.state.error?.message}
          </div>
          {this.state.error?.stack && (
            <>
              <button
                onClick={() => this.setState(s => ({ showStack: !s.showStack }))}
                className="error-dispatch__retry"
                style={{ marginTop: 'var(--spacing-md)' }}
              >
                {this.state.showStack ? 'HIDE' : 'SHOW'} STACK
              </button>
              {this.state.showStack && (
                <div className="error-dispatch__stack">
                  {this.state.error.stack}
                </div>
              )}
            </>
          )}
          <button
            onClick={() => this.setState({ hasError: false })}
            className="error-dispatch__retry"
          >
            RETRY
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
