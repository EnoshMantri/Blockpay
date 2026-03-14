import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary Caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="card max-w-md w-full border-danger/20">
            <h2 className="text-danger font-semibold mb-2">Something went wrong</h2>
            <p className="text-text-secondary text-sm mb-4">
              {this.state.error?.message || 'An unexpected error occurred in the UI.'}
            </p>
            <button 
              className="btn-ghost w-full"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
