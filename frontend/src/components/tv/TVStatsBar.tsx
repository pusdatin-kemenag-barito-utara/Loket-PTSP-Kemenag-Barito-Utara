import React from 'react';
import type { Stats } from '../../lib/types';

interface TVStatsBarProps {
	stats: Stats | null;
	waitingCount: number;
	calledCount: number;
	theme?: 'light' | 'dark';
}

export default function TVStatsBar({ stats, waitingCount, calledCount, theme = 'light' }: TVStatsBarProps) {
	const isLight = theme === 'light';

	return (
		<div className="grid grid-cols-4 gap-3 flex-1 min-h-[110px]">
			{/* Total Hari Ini */}
			<div
				className={`flex flex-col justify-between rounded-2xl border p-3.5 sm:p-4 text-center transition-all duration-300 relative overflow-hidden ${
					isLight
						? 'border-slate-200/90 bg-white shadow-xs'
						: 'border-slate-800/90 bg-gradient-to-b from-slate-900/95 to-slate-950/95 shadow-lg backdrop-blur-md'
				}`}
				style={isLight ? undefined : { backgroundColor: 'rgba(15, 23, 42, 0.95)' }}
			>
				<p
					className={`text-[11px] font-black uppercase tracking-wider text-center ${
						isLight ? 'text-slate-600' : 'text-slate-400'
					}`}
				>
					TOTAL ANTRIAN
				</p>
				<p
					className={`my-auto text-3xl sm:text-4xl xl:text-5xl font-black tabular-nums tracking-tight ${
						isLight ? 'text-slate-900' : 'text-white'
					}`}
				>
					{stats?.total_today ?? 0}
				</p>
				<p
					className={`text-[11px] font-bold uppercase tracking-wider border-t pt-1.5 ${
						isLight ? 'border-slate-100 text-slate-500' : 'border-white/5 text-slate-500'
					}`}
				>
					Nomor Terdaftar
				</p>
			</div>

			{/* Menunggu */}
			<div
				className={`flex flex-col justify-between rounded-2xl border p-3.5 sm:p-4 text-center transition-all duration-300 relative overflow-hidden ${
					isLight
						? 'border-amber-200/90 bg-amber-50/70 shadow-xs'
						: 'border-amber-500/40 bg-gradient-to-b from-amber-500/15 via-slate-900/90 to-slate-950 shadow-lg backdrop-blur-md'
				}`}
				style={isLight ? undefined : { backgroundColor: 'rgba(245, 158, 11, 0.12)' }}
			>
				<p
					className={`text-[11px] font-black uppercase tracking-wider text-center ${
						isLight ? 'text-amber-900' : 'text-amber-400'
					}`}
				>
					SEDANG MENUNGGU
				</p>
				<p
					className={`my-auto text-3xl sm:text-4xl xl:text-5xl font-black tabular-nums tracking-tight ${
						isLight ? 'text-amber-600' : 'text-amber-300 drop-shadow-[0_2px_12px_rgba(245,158,11,0.3)]'
					}`}
				>
					{stats?.waiting ?? waitingCount}
				</p>
				<p
					className={`text-[11px] font-bold uppercase tracking-wider border-t pt-1.5 ${
						isLight ? 'border-amber-200/60 text-amber-800' : 'border-amber-500/20 text-amber-400/80'
					}`}
				>
					Antrian Menunggu
				</p>
			</div>

			{/* Dipanggil */}
			<div
				className={`flex flex-col justify-between rounded-2xl border p-3.5 sm:p-4 text-center transition-all duration-300 relative overflow-hidden ${
					isLight
						? 'border-emerald-200/90 bg-emerald-50/70 shadow-xs'
						: 'border-emerald-500/40 bg-gradient-to-b from-emerald-500/15 via-slate-900/90 to-slate-950 shadow-lg backdrop-blur-md'
				}`}
				style={isLight ? undefined : { backgroundColor: 'rgba(16, 185, 129, 0.12)' }}
			>
				<p
					className={`text-[11px] font-black uppercase tracking-wider text-center ${
						isLight ? 'text-emerald-900' : 'text-emerald-400'
					}`}
				>
					SEDANG DILAYANI
				</p>
				<p
					className={`my-auto text-3xl sm:text-4xl xl:text-5xl font-black tabular-nums tracking-tight ${
						isLight ? 'text-emerald-700' : 'text-emerald-300 drop-shadow-[0_2px_12px_rgba(16,185,129,0.3)]'
					}`}
				>
					{stats?.called ?? calledCount}
				</p>
				<p
					className={`text-[11px] font-bold uppercase tracking-wider border-t pt-1.5 ${
						isLight ? 'border-emerald-200/60 text-emerald-800' : 'border-emerald-500/20 text-emerald-400/80'
					}`}
				>
					Di Loket Layanan
				</p>
			</div>

			{/* Selesai */}
			<div
				className={`flex flex-col justify-between rounded-2xl border p-3.5 sm:p-4 text-center transition-all duration-300 relative overflow-hidden ${
					isLight
						? 'border-slate-200/90 bg-slate-50/70 shadow-xs'
						: 'border-sky-500/30 bg-gradient-to-b from-sky-500/10 via-slate-900/90 to-slate-950 shadow-lg backdrop-blur-md'
				}`}
				style={isLight ? undefined : { backgroundColor: 'rgba(14, 165, 233, 0.1)' }}
			>
				<p
					className={`text-[11px] font-black uppercase tracking-wider text-center ${
						isLight ? 'text-slate-700' : 'text-sky-400'
					}`}
				>
					SUDAH SELESAI
				</p>
				<p
					className={`my-auto text-3xl sm:text-4xl xl:text-5xl font-black tabular-nums tracking-tight ${
						isLight ? 'text-slate-800' : 'text-sky-200'
					}`}
				>
					{stats?.completed ?? 0}
				</p>
				<p
					className={`text-[11px] font-bold uppercase tracking-wider border-t pt-1.5 ${
						isLight ? 'border-slate-200 text-slate-600' : 'border-sky-500/20 text-sky-400/80'
					}`}
				>
					Layanan Rampung
				</p>
			</div>
		</div>
	);
}
