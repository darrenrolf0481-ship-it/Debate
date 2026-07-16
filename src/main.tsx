import {Component, StrictMode, type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Catches render-time crashes and shows the error instead of a white screen.
interface ErrorBoundaryProps { children: ReactNode }
interface ErrorBoundaryState { error: Error | null }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {error};
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{minHeight: '100vh', background: '#171717', color: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'ui-sans-serif, system-ui, sans-serif'}}>
          <div style={{maxWidth: '42rem'}}>
            <h1 style={{fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem'}}>Something went wrong</h1>
            <pre style={{whiteSpace: 'pre-wrap', background: '#262626', border: '1px solid #404040', borderRadius: '0.5rem', padding: '1rem', fontSize: '0.8rem', color: '#fca5a5', overflow: 'auto'}}>
              {this.state.error.message}
            </pre>
            <button
              onClick={() => { localStorage.clear(); location.reload(); }}
              style={{marginTop: '1rem', padding: '0.5rem 1rem', background: '#f5f5f5', color: '#171717', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem'}}
            >
              Reset saved settings &amp; reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
