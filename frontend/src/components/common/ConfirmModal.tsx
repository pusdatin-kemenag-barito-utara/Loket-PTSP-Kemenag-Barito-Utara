import React from 'react';
import { TrashIcon, XMarkIcon } from './Icons';

export interface ConfirmModalProps {
	isOpen: boolean;
	title: string;
	message: React.ReactNode;
	confirmText?: string;
	cancelText?: string;
	variant?: 'danger' | 'warning' | 'info';
	isLoading?: boolean;
	onConfirm: () => void;
	onClose: () => void;
}

export default function ConfirmModal({
	isOpen,
	title,
	message,
	confirmText = 'Hapus',
	cancelText = 'Batal',
	variant = 'danger',
	isLoading = false,
	onConfirm,
	onClose,
}: ConfirmModalProps) {
	// Handle Escape key to close modal
	React.useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const isDanger = variant === 'danger';
	const isWarning = variant === 'warning';

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fade-in"
				onClick={onClose}
			/>

			{/* Modal Card */}
			<div
				role="dialog"
				aria-modal="true"
				className="relative z-10 w-full max-w-md transform overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all animate-scale-up"
			>
				{/* Close Icon Button */}
				<button
					type="button"
					onClick={onClose}
					className="absolute top-5 right-5 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
				>
					<XMarkIcon className="h-5 w-5" />
				</button>

				<div className="flex items-start gap-4">
					{/* Icon Badge */}
					<div
						className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-8 ${
							isDanger
								? 'bg-rose-100 text-rose-600 ring-rose-50'
								: isWarning
								? 'bg-amber-100 text-amber-600 ring-amber-50'
								: 'bg-blue-100 text-blue-600 ring-blue-50'
						}`}
					>
						{isDanger ? (
							<TrashIcon className="h-6 w-6 stroke-[2]" />
						) : (
							<span className="text-xl font-black">!</span>
						)}
					</div>

					{/* Text Details */}
					<div className="flex-1 pr-4">
						<h3 className="text-base font-black text-slate-900 tracking-tight">
							{title}
						</h3>
						<div className="mt-1.5 text-xs text-slate-500 leading-relaxed">
							{message}
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
					<button
						type="button"
						disabled={isLoading}
						onClick={onClose}
						className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all disabled:opacity-50"
					>
						{cancelText}
					</button>

					<button
						type="button"
						disabled={isLoading}
						onClick={onConfirm}
						className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all disabled:opacity-50 ${
							isDanger
								? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 active:scale-95'
								: isWarning
								? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20 active:scale-95'
								: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 active:scale-95'
						}`}
					>
						{isDanger && <TrashIcon className="h-4 w-4" />}
						{isLoading ? 'Memproses...' : confirmText}
					</button>
				</div>
			</div>
		</div>
	);
}
