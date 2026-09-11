import React from 'react';
import { CheckCircleIcon, XMarkIcon } from './Icons';

export interface ToastData {
	id?: string;
	type: 'success' | 'error' | 'info';
	title: string;
	message?: string;
	duration?: number; // Duration in ms before auto-dismiss, defaults to 4000ms
}

interface ToastProps {
	toast: ToastData | null;
	onClose: () => void;
	defaultDuration?: number;
}

export default function Toast({ toast, onClose, defaultDuration = 4000 }: ToastProps) {
	const [isPaused, setIsPaused] = React.useState(false);
	const duration = toast?.duration ?? defaultDuration;

	// Auto-dismiss timer with pause on hover
	React.useEffect(() => {
		if (!toast) return;

		let timer: ReturnType<typeof setTimeout> | null = null;
		if (!isPaused) {
			timer = setTimeout(() => {
				onClose();
			}, duration);
		}

		return () => {
			if (timer) clearTimeout(timer);
		};
	}, [toast, onClose, duration, isPaused]);

	if (!toast) return null;

	const isSuccess = toast.type === 'success';
	const isError = toast.type === 'error';

	return (
		<div
			onMouseEnter={() => setIsPaused(true)}
			onMouseLeave={() => setIsPaused(false)}
			className="fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl transition-all duration-300 max-w-md animate-fade-up sm:bottom-8 sm:right-8"
		>
			<div className="flex items-start gap-3.5 p-4">
				{/* Status Icon */}
				<div
					className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
						isSuccess
							? 'bg-emerald-100 text-emerald-700'
							: isError
							? 'bg-rose-100 text-rose-700'
							: 'bg-amber-100 text-amber-700'
					}`}
				>
					{isSuccess ? (
						<CheckCircleIcon className="h-5 w-5 stroke-[2.5]" />
					) : (
						<span className="text-base font-black">!</span>
					)}
				</div>

				{/* Message Content */}
				<div className="flex-1 pr-2">
					<div className="flex items-center justify-between gap-2">
						<h4
							className={`text-sm font-black ${
								isSuccess ? 'text-slate-900' : isError ? 'text-rose-900' : 'text-slate-900'
							}`}
						>
							{toast.title}
						</h4>
					</div>
					{toast.message && (
						<p className="mt-0.5 text-xs font-medium text-slate-500 leading-relaxed">
							{toast.message}
						</p>
					)}
				</div>

				{/* Close Button */}
				<button
					type="button"
					onClick={onClose}
					title="Tutup notifikasi"
					className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
				>
					<XMarkIcon className="h-4 w-4" />
				</button>
			</div>

			{/* Auto-Dismiss Progress Bar Indicator */}
			<div className="h-1 w-full bg-slate-100 overflow-hidden">
				<div
					key={toast.title + (toast.message || '')}
					className={`h-full origin-left ${
						isSuccess ? 'bg-emerald-500' : isError ? 'bg-rose-500' : 'bg-amber-500'
					}`}
					style={{
						animation: `toast-progress ${duration}ms linear forwards`,
						animationPlayState: isPaused ? 'paused' : 'running',
					}}
				/>
			</div>
		</div>
	);
}
