import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("StudyBuddy ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#030005] text-[#f5f5f5] p-6">
          <div className="max-w-md w-full bg-[#18181b] border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6 text-[#E04D4D]">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-bold font-brand mb-2">Something went wrong</h2>
            <p className="text-[#a1a1aa] text-sm mb-6">
              An unexpected error occurred while rendering this page. You can try refreshing or returning to the home screen.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#BA3C3C] hover:bg-[#E04D4D] text-white text-sm font-semibold transition-colors duration-200 cursor-pointer shadow-lg shadow-red-500/20"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold border border-white/10 transition-colors duration-200 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
