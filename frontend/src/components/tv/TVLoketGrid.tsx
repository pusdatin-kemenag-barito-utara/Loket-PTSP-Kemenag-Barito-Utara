import React from 'react';
import type { Category, Queue } from '../../lib/types';
import { formatTicketNumber } from '../../lib/format';

interface TVLoketGridProps {
	categories: Category[];
	waitingList: Queue[];
	currentQueue: Queue | null;
	recentlyCalledId: string | null;
}

const DEFAULT_CATEGORIES = [
	{ id: '1', code: 'A', name: 'Pelayanan Umum', description: '', display_order: 1, is_active: true },
	{ id: '2', code: 'B', name: 'Kepegawaian', description: '', display_order: 2, is_active: true },
	{ id: '3', code: 'C', name: 'Pendidikan Islam', description: '', display_order: 3, is_active: true },
	{ id: '4', code: 'D', name: 'Haji & Umrah', description: '', display_order: 4, is_active: true },
];

export default function TVLoketGrid({
	categories,
	waitingList,
	currentQueue,
	recentlyCalledId,
}: TVLoketGridProps) {
	const activeCategories = (categories || []).filter((c) => c && c.is_active !== false);
	const catList = activeCategories.length > 0 ? activeCategories : DEFAULT_CATEGORIES;

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
		<div className="flex-1">
			<p className="mb-2 text-xs font-bold tracking-widest text-slate-400 uppercase">
				STATUS LOKET PELAYANAN
			</p>
			<div className="grid grid-cols-2 gap-3">
				{catList.map((cat) => {
					const { activeTicket, waitingCount, isHighlighted } = getStatus(cat as Category);

					return (
						<div
							key={cat.code}
							className={`flex flex-col justify-between rounded-2xl border p-4 transition-all duration-300 ${
								isHighlighted
									? 'border-amber-400 bg-amber-500/20 shadow-[0_0_24px_rgba(255,199,44,0.35)] ring-2 ring-amber-400'
									: activeTicket
									? 'border-emerald-500/40 bg-slate-900 shadow-md ring-1 ring-emerald-500/20'
									: 'border-slate-800 bg-slate-900/85 shadow-xs'
							}`}
							style={{ backgroundColor: isHighlighted ? 'rgba(245, 158, 11, 0.2)' : activeTicket ? '#0f172a' : 'rgba(15, 23, 42, 0.85)' }}
						>
							{/* Loket Header */}
							<div className="flex items-center justify-between gap-2">
								<div className="flex items-center gap-2 min-w-0">
									<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-kmenag-green text-xs font-black text-white">
										{cat.code}
									</span>
									<span className="text-xs font-bold text-white truncate" title={cat.name}>
										{cat.name}
									</span>
								</div>
								<span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400">
									Loket {cat.code}
								</span>
							</div>

							{/* Active Ticket Number */}
							<div className="my-3 text-center">
								{activeTicket ? (
									<div>
										<p className="text-3xl font-black text-white tabular-nums tracking-tight">
											{cat.code} - {formatTicketNumber(activeTicket.ticket_number)}
										</p>
										<p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
											Sedang Dilayani
										</p>
									</div>
								) : (
									<div>
										<p className="text-2xl font-bold text-slate-600">—</p>
										<p className="text-[10px] font-medium text-slate-500">Menunggu</p>
									</div>
								)}
							</div>

							{/* Waiting Counter */}
							<div className="flex items-center justify-between border-t border-white/5 pt-2 text-[11px]">
								<span className="text-slate-400">Antrian:</span>
								<span
									className={`font-bold ${
										waitingCount > 0 ? 'text-amber-400 font-extrabold' : 'text-slate-500'
									}`}
								>
									{waitingCount} orang
								</span>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
