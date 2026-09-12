import React from 'react';
import type { Category } from '../../lib/types';
import { HandTouchIcon, TicketIcon } from '../common/Icons';

interface KioskCategoryGridProps {
	categories: Category[];
	creating: boolean;
	selectedCategoryId?: string | null;
	onSelectCategory: (cat: Category) => void;
}

export default function KioskCategoryGrid({
	categories,
	creating,
	selectedCategoryId,
	onSelectCategory,
}: KioskCategoryGridProps) {
	// Fallback to active categories sorted by display order
	const activeCategories = [...categories]
		.filter((c) => c && c.is_active !== false)
		.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

	return (
		<div className="w-full max-w-7xl mx-auto px-2 sm:px-4">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
				{activeCategories.map((cat) => {
					const isThisCreating = creating && selectedCategoryId === cat.id;

					return (
						<button
							key={cat.id}
							type="button"
							onClick={() => onSelectCategory(cat)}
							disabled={creating}
							className="group relative flex flex-col justify-between rounded-3xl border-2 border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-600 hover:shadow-xl active:scale-[0.97] cursor-pointer disabled:cursor-wait disabled:opacity-80 select-none overflow-hidden"
						>
							{/* Subtle top indicator bar on hover */}
							<div className="absolute top-0 left-0 right-0 h-1.5 bg-transparent transition-colors group-hover:bg-emerald-600" />

							<div>
								{/* Header: Letter Badge & Loket Pill */}
								<div className="flex items-center justify-between gap-3">
									<span className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-emerald-200 bg-emerald-50 text-3xl sm:text-4xl font-black text-emerald-800 shadow-xs transition-colors group-hover:border-emerald-600 group-hover:bg-emerald-700 group-hover:text-white">
										{cat.code}
									</span>
									<span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-700 group-hover:border-emerald-200 group-hover:bg-emerald-50 group-hover:text-emerald-800 transition-colors">
										LOKET {cat.code}
									</span>
								</div>

								{/* Service Title & Description */}
								<div className="mt-4">
									<h2 className="text-lg sm:text-xl font-black leading-snug text-slate-900 group-hover:text-emerald-900 transition-colors">
										{cat.name}
									</h2>
									<p className="mt-1 text-xs sm:text-sm font-semibold text-slate-500 line-clamp-2 leading-relaxed">
										{cat.description || `Pelayanan ${cat.name}`}
									</p>
								</div>
							</div>

							{/* Large Touch Action Button */}
							<div className="mt-5 pt-3 border-t border-slate-100">
								<div
									className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-sm sm:text-base font-black transition-all shadow-xs ${
										isThisCreating
											? 'bg-amber-500 text-slate-950 animate-pulse'
											: 'bg-emerald-700 text-white group-hover:bg-emerald-800 shadow-emerald-700/20'
									}`}
								>
									{isThisCreating ? (
										<>
											<span className="h-4 w-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
											<span>Mencetak Tiket...</span>
										</>
									) : (
										<>
											<HandTouchIcon className="h-5 w-5 shrink-0" />
											<span>Sentuh Ambil Nomor</span>
										</>
									)}
								</div>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}

