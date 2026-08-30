import React from 'react';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';

/**
 * Top-Level React Error Boundary (500 Unexpected Runtime Crash Handler)
 * Catches JavaScript lifecycle errors in children trees, presents a graceful
 * recovery interface, and prevents blank white-screens.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('Learnify Uncaught UI Exception:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-offwhite)',
            padding: '2rem'
          }}
        >
          <div
            className="card-white"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '2.5rem 2rem',
              borderRadius: 'var(--radius-xl)',
              textAlign: 'center',
              boxShadow: 'var(--shadow-md)',
              border: '1.5px solid #fecaca'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                backgroundColor: 'var(--color-red-light)',
                color: 'var(--color-red)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <AlertOctagon size={32} />
            </div>

            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-red)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
              Error 500 • Unexpected Application State
            </div>

            <h1
              style={{
                fontSize: '1.6rem',
                fontWeight: 700,
                color: 'var(--color-ink)',
                marginBottom: '0.65rem',
                lineHeight: 1.25
              }}
            >
              Something went wrong in the workspace
            </h1>

            <p
              style={{
                fontSize: '0.92rem',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
                marginBottom: '1.75rem'
              }}
            >
              Learnify encountered an unexpected runtime exception. Your session data is intact in the local vector cache. You can reload the page or return to the main dashboard.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <Button
                variant="orange"
                size="md"
                onClick={this.handleReload}
                icon={RefreshCw}
              >
                Reload Application
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={this.handleGoHome}
                icon={Home}
              >
                Return to Home
              </Button>
            </div>

            {/* Collapsible stack in development mode */}
            {import.meta.env.DEV && this.state.error && (
              <details style={{ textAlign: 'left', marginTop: '1rem' }}>
                <summary style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                  Technical Stack Trace (Development Only)
                </summary>
                <pre
                  style={{
                    backgroundColor: 'var(--color-offwhite)',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.72rem',
                    color: '#991b1b',
                    overflowX: 'auto',
                    marginTop: '0.5rem',
                    maxHeight: '160px'
                  }}
                >
                  {this.state.error.toString()}
                  {'\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
