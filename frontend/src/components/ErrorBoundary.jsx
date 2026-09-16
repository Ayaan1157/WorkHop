import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#F9F9F6] dark:bg-[#121212] p-4 text-ink dark:text-white">
          <div className="w-full max-w-md border-2 border-ink dark:border-[#333] bg-white dark:bg-[#1a1a1a] p-6 shadow-[6px_6px_0px_#121212] text-center">
            <span className="inline-block bg-brand px-3 py-1 text-xs font-black text-white uppercase tracking-wider">
              System Notice
            </span>
            <h2 className="mt-3 text-xl font-black text-ink dark:text-white">
              Something went wrong
            </h2>
            <p className="mt-2 text-xs text-inkmuted dark:text-gray-400 font-semibold">
              The application encountered a display issue. Please refresh or return to the home screen.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 border-2 border-ink bg-sand dark:bg-[#222] py-2.5 text-xs font-black text-ink dark:text-white hover:bg-white"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 border-2 border-ink bg-brand py-2.5 text-xs font-black text-white hover:opacity-95 shadow-[2px_2px_0px_#121212]"
              >
                Go to Homepage
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
