import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            background: '#F8FAFC',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '8px', color: '#0F172A' }}>
              Une difficulté est survenue
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '16px' }}>
              COMMERCIA a rencontré un imprévu lors de l'affichage de cet écran.
            </p>
            {this.state.error && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  textAlign: 'left',
                  marginBottom: '18px',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  wordBreak: 'break-word',
                }}
              >
                <strong>{this.state.error.name}:</strong> {this.state.error.message}
              </div>
            )}
            <button
              className="btn btn-primary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Rafraîchir la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
