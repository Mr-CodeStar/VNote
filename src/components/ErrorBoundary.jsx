import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Vnote React ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="full-screen-loader error">
          <AlertCircle size={48} className="error-icon" />
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message || 'An unexpected rendering error occurred.'}</p>
          <button className="btn primary-btn" onClick={this.handleReload}>
            <RefreshCw size={16} /> Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
