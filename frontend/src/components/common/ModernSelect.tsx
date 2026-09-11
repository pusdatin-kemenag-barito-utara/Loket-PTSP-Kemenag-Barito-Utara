import React from 'react';

export interface OptionItem {
	value: string;
	label: string;
	description?: string;
	badge?: string;
	icon?: React.ReactNode;
}

interface ModernSelectProps {
	value: string;
	onChange: (value: string) => void;
	options: OptionItem[];
	label?: string;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	buttonClassName?: string;
	menuClassName?: string;
	size?: 'sm' | 'md';
	compact?: boolean;
}

export default function ModernSelect({
	value,
	onChange,
	options,
	label,
	placeholder = 'Pilih opsi...',
	disabled = false,
	className = '',
	buttonClassName = '',
	menuClassName = '',
	size = 'md',
	compact = false,
}: ModernSelectProps) {
	const [isOpen, setIsOpen] = React.useState(false);
	const containerRef = React.useRef<HTMLDivElement>(null);

	const selectedOption = options.find((o) => o.value === value);

	// Close on outside click
	React.useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			document.addEventListener('keydown', handleKeyDown);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isOpen]);

	const handleSelect = (val: string) => {
		onChange(val);
		setIsOpen(false);
	};

	const sizeClasses = {
		sm: 'px-2.5 py-1.5 text-xs rounded-lg',
		md: 'px-3.5 py-2.5 text-sm rounded-xl',
	}[size];

	return (
		<div className={`relative ${className}`} ref={containerRef}>
			{label && (
				<label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
					{label}
				</label>
			)}

			{/* Trigger Button */}
			<button
				type="button"
				disabled={disabled}
				onClick={() => !disabled && setIsOpen(!isOpen)}
				className={`flex w-full items-center justify-between gap-2 border border-slate-200 bg-slate-50 font-semibold text-slate-900 transition-all hover:bg-white hover:border-slate-300 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${buttonClassName} ${
					isOpen ? 'border-emerald-600 bg-white ring-1 ring-emerald-600' : ''
				}`}
			>
				<div className="flex items-center gap-2 truncate text-left">
					{selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
					<span className={`truncate ${!selectedOption ? 'text-slate-400 font-normal' : ''}`}>
						{selectedOption ? selectedOption.label : placeholder}
					</span>
					{selectedOption?.badge && (
						<span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
							{selectedOption.badge}
						</span>
					)}
				</div>

				<svg
					className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
						isOpen ? 'rotate-180 text-emerald-600' : ''
					}`}
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={2}
				>
					<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{/* Dropdown Menu */}
			{isOpen && (
				<div
					className={`absolute left-0 top-full mt-1.5 w-full min-w-[200px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50 animate-fade-up ${menuClassName}`}
				>
					<div className="max-h-60 overflow-y-auto custom-scrollbar space-y-0.5">
						{options.map((opt) => {
							const isSelected = opt.value === value;
							return (
								<button
									key={opt.value}
									type="button"
									onClick={() => handleSelect(opt.value)}
									className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${
										isSelected
											? 'bg-emerald-50 text-emerald-900 font-bold'
											: 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
									}`}
								>
									<div className="flex items-center gap-2 truncate">
										{opt.icon && <span className="shrink-0">{opt.icon}</span>}
										<div className="truncate">
											<p className="truncate tracking-tight">{opt.label}</p>
											{opt.description && (
												<p className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
													{opt.description}
												</p>
											)}
										</div>
									</div>

									<div className="flex items-center gap-2 shrink-0 ml-2">
										{opt.badge && (
											<span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 group-hover:bg-slate-200">
												{opt.badge}
											</span>
										)}
										{isSelected && (
											<svg
												className="h-4 w-4 text-emerald-600 shrink-0"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
												strokeWidth={2.5}
											>
												<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
											</svg>
										)}
									</div>
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
