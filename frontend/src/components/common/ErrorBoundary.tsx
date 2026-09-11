import React from 'react';

interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error('ErrorBoundary caught an error:', error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}
			return (
				<div className="flex h-full w-full items-center justify-center rounded-3xl border border-rose-500/30 bg-slate-950 p-6 text-center text-slate-300">
					<div>
						<p className="text-sm font-semibold text-rose-400">Terjadi kendala saat memuat tayangan media</p>
						<p className="mt-1 text-xs text-slate-500">{this.state.error?.message}</p>
						<button
							onClick={() => this.setState({ hasError: false, error: null })}
							className="mt-3 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
						>
							Muat Ulang
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
