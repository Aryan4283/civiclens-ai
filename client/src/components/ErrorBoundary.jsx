import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Oops! Something went wrong.</h1>
            <p className="text-gray-600 mb-6 text-sm">
              The application encountered an unexpected error while rendering this page.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = '/';
              }}
              className="w-full bg-civic-primary hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200"
            >
              Return to Home
            </button>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left p-4 bg-gray-50 rounded-lg text-xs font-mono text-red-600 overflow-auto max-h-40">
                <summary className="font-bold text-gray-700 cursor-pointer mb-2">Error Details (Dev Only)</summary>
                {this.state.errorInfo?.componentStack || 'Unknown Error'}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
