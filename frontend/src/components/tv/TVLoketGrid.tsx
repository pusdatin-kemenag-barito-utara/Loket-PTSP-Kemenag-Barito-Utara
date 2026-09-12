import React from 'react';
import type { Category, Queue } from '../../lib/types';
import { formatTicketNumber } from '../../lib/format';

interface TVLoketGridProps {
	categories: Category[];
	waitingList: Queue[];
	currentQueue: Queue | null;
	recentlyCalledId: string | null;
	theme?: 'light' | 'dark';
}

export default function TVLoketGrid({
	categories,
	waitingList,
	currentQueue,
	recentlyCalledId,
	theme = 'light',
}: TVLoketGridProps) {
	const isLight = theme === 'light';

	// Filter active categories and sort dynamically by display_order then code
	const catList = React.useMemo(() => {
		return (categories || [])
			.filter((c) => c && c.is_active !== false)
			.sort((a, b) => {
				const orderA = a.display_order ?? 0;
				const orderB = b.display_order ?? 0;
				if (orderA !== orderB) return orderA - orderB;
				return (a.code || '').localeCompare(b.code || '');
			});
	}, [categories]);

	const rowCount = Math.max(1, Math.ceil(catList.length / 2));
	const isCompact = rowCount >= 5;

	const getStatus = (cat: Category) => {
		const activeForCat = waitingList.find((q) => q.category_id === cat.id && q.status === 'called');
		const waitingCount = waitingList.filter((q) => q.category_id === cat.id && q.status === 'waiting').length;
		const isCurrentlyActive = currentQueue && currentQueue.category_id === cat.id;

		return {
			activeTicket: isCurrentlyActive ? currentQueue : activeForCat || null,
			waitingCount,
			isHighlighted: isCurrentlyActive && recentlyCalledId === currentQueue.id,
		};
	};

	return (
		<div className="flex-1 flex flex-col min-h-0">
			{/* Grid Header Label */}
			<div className="mb-2 flex items-center justify-between shrink-0">
				<div className="flex items-center gap-2">
					<span className={`h-2.5 w-2.5 rounded-full ${isLight ? 'bg-emerald-700' : 'bg-emerald-400'}`} />
					<p
						className={`text-xs font-black tracking-wider uppercase ${
							isLight ? 'text-slate-900' : 'text-slate-300'
						}`}
					>
						STATUS LOKET PELAYANAN ({catList.length} LOKET AKTIF)
					</p>
				</div>
				<span className={`text-[11px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
					Sinkron Realtime
				</span>
			</div>

			{catList.length === 0 ? (
				<div
					className={`flex-1 flex flex-col items-center justify-center rounded-2xl border p-6 text-center min-h-[220px] ${
						isLight
							? 'border-slate-200 bg-white shadow-xs'
							: 'border-slate-800/80 bg-slate-900/60'
					}`}
				>
					<div
						className={`flex h-12 w-12 items-center justify-center rounded-full border mb-3 ${
							isLight
								? 'bg-emerald-50 border-emerald-200'
								: 'bg-emerald-500/10 border-emerald-500/20'
						}`}
					>
						<span
							className={`h-3 w-3 rounded-full animate-ping ${
								isLight ? 'bg-emerald-700' : 'bg-emerald-400'
							}`}
						/>
					</div>
					<p className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
						Memuat Data Layanan Loket...
					</p>
					<p className={`text-xs mt-1 max-w-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
						Daftar loket layanan disinkronkan secara dinamis dari panel admin.
					</p>
				</div>
			) : (
				/* Dynamic Loket Cards in 2 Columns, automatically adapting rows to fill available height */
				<div
					className={`grid grid-cols-2 ${isCompact ? 'gap-2' : 'gap-2.5'} flex-1 min-h-0`}
					style={{
						gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
					}}
				>
					{catList.map((cat, idx) => {
						const { activeTicket, waitingCount, isHighlighted } = getStatus(cat);
						const isLastOdd = catList.length % 2 !== 0 && idx === catList.length - 1;

						return (
							<div
								key={cat.id || cat.code}
								className={`group flex flex-col justify-between rounded-2xl border ${
									isCompact ? 'px-3 py-1.5' : 'px-3.5 py-2.5'
								} transition-all duration-300 relative overflow-hidden h-full ${
									isLastOdd ? 'col-span-2' : 'col-span-1'
								} ${
									isLight
										? isHighlighted
											? 'border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-400'
											: activeTicket
											? 'border-emerald-500 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-400'
											: 'border-slate-200 bg-white shadow-xs hover:border-slate-300'
										: isHighlighted
										? 'border-amber-400 bg-gradient-to-br from-amber-500/25 via-slate-900 to-slate-950 shadow-[0_0_24px_rgba(255,199,44,0.4)] ring-2 ring-amber-400'
										: activeTicket
										? 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 shadow-md ring-1 ring-emerald-500/30'
										: 'border-slate-800/80 bg-slate-900/90 shadow-sm hover:border-slate-700/80'
								}`}
								style={
									isLight
										? undefined
										: {
												backgroundColor: isHighlighted
													? 'rgba(245, 158, 11, 0.2)'
													: activeTicket
													? '#0b1626'
													: 'rgba(15, 23, 42, 0.9)',
										  }
								}
							>
								{/* Loket Header */}
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2.5 min-w-0">
										<span
											className={`flex ${
												isCompact ? 'h-6 w-6 text-[11px]' : 'h-7 w-7 text-xs'
											} shrink-0 items-center justify-center rounded-lg font-black text-white shadow-xs ${
												activeTicket
													? 'bg-emerald-600'
													: 'bg-emerald-700'
											}`}
										>
											{cat.code}
										</span>
										<span
											className={`text-xs sm:text-[13px] font-bold truncate ${
												isLight ? 'text-slate-900' : 'text-white'
											}`}
											title={cat.name}
										>
											{cat.name}
										</span>
									</div>
									<span
										className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border ${
											activeTicket
												? isLight
													? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-extrabold'
													: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
												: isLight
												? 'bg-slate-100 border-slate-300 text-slate-700 font-extrabold'
												: 'bg-white/5 border-white/10 text-slate-400'
										}`}
									>
										Loket {cat.code}
									</span>
								</div>

								{/* Active / Current Status Body */}
								<div className="my-auto py-1 flex items-center justify-between">
									{activeTicket ? (
										<div className="w-full flex items-center justify-between">
											<p
												className={`${
													isCompact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
												} font-black tabular-nums tracking-tight ${
													isLight
														? 'text-emerald-800'
														: 'text-white drop-shadow-[0_2px_8px_rgba(16,185,129,0.3)]'
												}`}
											>
												{cat.code} - {formatTicketNumber(activeTicket.ticket_number)}
											</p>
											<span
												className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${
													isLight
														? 'bg-emerald-700 text-white shadow-xs'
														: 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
												}`}
											>
												<span
													className={`h-1.5 w-1.5 rounded-full ${
														isLight ? 'bg-emerald-200' : 'bg-emerald-400 animate-ping'
													}`}
												/>
												Melayani
											</span>
										</div>
									) : (
										<div className="w-full flex items-center justify-between">
											<p
												className={`${
													isCompact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
												} font-black tracking-wider font-mono ${
													isLight ? 'text-slate-600' : 'text-slate-600'
												}`}
											>
												{cat.code} - 000
											</p>
											<span
												className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
													isLight
														? 'border-slate-300 bg-slate-100 text-slate-600'
														: 'border-slate-700/60 bg-slate-800/60 text-slate-400'
												}`}
											>
												<span
													className={`h-1.5 w-1.5 rounded-full ${
														isLight ? 'bg-slate-400' : 'bg-slate-500'
													}`}
												/>
												Standby
											</span>
										</div>
									)}
								</div>

								{/* Waiting Counter Footer */}
								<div
									className={`flex items-center justify-between border-t pt-1.5 text-[11px] ${
										isLight ? 'border-slate-100' : 'border-white/5'
									}`}
								>
									<span className={`font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
										Sisa Antrian:
									</span>
									<span
										className={`font-bold px-2 py-0.5 rounded-md ${
											waitingCount > 0
												? isLight
													? 'bg-amber-100 border border-amber-300 text-amber-900 font-extrabold'
													: 'bg-amber-500/20 border border-amber-500/30 text-amber-300 font-extrabold animate-pulse'
												: isLight
												? 'text-slate-500'
												: 'text-slate-500'
										}`}
									>
										{waitingCount > 0 ? `${waitingCount} orang` : '0 orang'}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
