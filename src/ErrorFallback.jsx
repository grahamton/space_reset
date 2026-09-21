import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

class ErrorFallback extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by Error Boundary:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
    // Optionally reload the page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[100dvh] bg-white text-gray-900 font-sans flex flex-col items-center justify-center p-6 text-center">
          <div className="flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Oops! Something Went Wrong</h1>

          <p className="text-gray-600 max-w-sm mb-6 leading-relaxed">
            An unexpected error occurred. Don't worry—your data is safe. Try reloading the page.
          </p>

          {import.meta.env.DEV && this.state.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-w-md text-left text-sm font-mono text-red-700 overflow-auto max-h-40">
              <p className="font-bold mb-1">Error Details:</p>
              <p>{this.state.error.toString()}</p>
            </div>
          )}

          <button
            onClick={this.resetError}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg"
          >
            <RotateCcw className="w-5 h-5" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorFallback;
