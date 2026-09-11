import React from 'react';
import type { Stats } from '../../lib/types';

interface TVStatsBarProps {
	stats: Stats | null;
	waitingCount: number;
	calledCount: number;
}

export default function TVStatsBar({ stats, waitingCount, calledCount }: TVStatsBarProps) {
	return (
		<div className="grid grid-cols-4 gap-3 shrink-0">
			<div
				className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 text-center shadow-md backdrop-blur-md"
				style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
			>
				<p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Hari Ini</p>
				<p className="mt-1 text-2xl font-black text-white tabular-nums sm:text-3xl">
					{stats?.total_today ?? 0}
				</p>
			</div>
			<div
				className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-center shadow-md backdrop-blur-md"
				style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
			>
				<p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Menunggu</p>
				<p className="mt-1 text-2xl font-black text-amber-300 tabular-nums sm:text-3xl">
					{stats?.waiting ?? waitingCount}
				</p>
			</div>
			<div
				className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-center shadow-md backdrop-blur-md"
				style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
			>
				<p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Dipanggil</p>
				<p className="mt-1 text-2xl font-black text-emerald-300 tabular-nums sm:text-3xl">
					{stats?.called ?? calledCount}
				</p>
			</div>
			<div
				className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 text-center shadow-md backdrop-blur-md"
				style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
			>
				<p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Selesai</p>
				<p className="mt-1 text-2xl font-black text-slate-200 tabular-nums sm:text-3xl">
					{stats?.completed ?? 0}
				</p>
			</div>
		</div>
	);
}
