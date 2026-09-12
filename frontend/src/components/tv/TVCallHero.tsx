import React from 'react';
import type { Queue } from '../../lib/types';
import { formatTicketNumber } from '../../lib/format';
import { ArrowRightIcon } from '../common/Icons';

interface TVCallHeroProps {
	current: Queue | null;
	isRecentlyCalled: boolean;
	history: Queue[];
	theme?: 'light' | 'dark';
}

export default function TVCallHero({ current, isRecentlyCalled, history, theme = 'light' }: TVCallHeroProps) {
	const isLight = theme === 'light';

	return (
		<div
			className={`relative flex flex-col justify-between overflow-hidden rounded-3xl border p-4 sm:p-5 text-center transition-all duration-500 shrink-0 ${
				isLight
					? current
						? isRecentlyCalled
							? 'animate-pulse-ring border-amber-400 bg-amber-50/80 shadow-[0_4px_30px_rgba(245,158,11,0.25)] ring-2 ring-amber-400'
							: 'border-amber-400 bg-amber-50/50 shadow-md'
						: 'border-slate-200 bg-white shadow-xs'
					: current
					? isRecentlyCalled
						? 'animate-pulse-ring border-kmenag-gold bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 shadow-[0_0_50px_rgba(255,199,44,0.3)]'
						: 'border-amber-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 shadow-2xl'
					: 'border-slate-800/90 bg-gradient-to-b from-slate-900/95 via-slate-900 to-slate-950/95 shadow-xl'
			}`}
			style={isLight ? undefined : { backgroundColor: '#0b1329' }}
		>
			{/* Top Header */}
			<div className="flex items-center justify-between">
				<span
					className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-black tracking-wider uppercase shadow-xs ${
						isLight
							? 'bg-emerald-800 text-white'
							: 'border border-kmenag-gold/40 bg-kmenag-gold/15 text-kmenag-gold'
					}`}
				>
					<span
						className={`h-2 w-2 rounded-full ${
							isLight ? 'bg-emerald-200' : 'bg-kmenag-gold animate-ping'
						}`}
					/>
					PANGGILAN AKTIF
				</span>
				<span
					className={`text-xs font-bold px-3 py-1 rounded-full border ${
						current
							? isLight
								? 'border-emerald-300 bg-emerald-100 text-emerald-900 font-black'
								: 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
							: isLight
							? 'border-slate-300 bg-slate-100 text-slate-700 font-bold'
							: 'border-slate-700/60 bg-slate-800/60 text-slate-300'
					}`}
				>
					{current ? 'Sedang Dilayani' : 'Siap Melayani'}
				</span>
			</div>

			{/* Ticket Big Number Display */}
			<div className="py-2.5 my-auto">
				{current ? (
					<div className="space-y-1.5">
						<p
							className={`text-5xl font-black tracking-tight tabular-nums sm:text-6xl xl:text-7xl ${
								isLight
									? 'text-amber-600'
									: 'text-gradient-gold drop-shadow-[0_4px_24px_rgba(255,199,44,0.4)]'
							}`}
						>
							{current.category_code} - {formatTicketNumber(current.ticket_number)}
						</p>
						<p
							className={`text-lg font-black sm:text-xl truncate ${
								isLight ? 'text-slate-900' : 'text-white'
							}`}
						>
							{current.category_name}
						</p>
						<div
							className={`mt-2.5 inline-flex items-center gap-2 rounded-xl px-6 py-2.5 shadow-md ${
								isLight
									? 'bg-emerald-700 text-white'
									: 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
							}`}
						>
							<ArrowRightIcon className="h-4 w-4 text-white" />
							<span className="text-base font-black tracking-wider uppercase sm:text-lg text-white">
								SILAKAN MENUJU LOKET {current.category_code}
							</span>
						</div>
					</div>
				) : (
					<div className="py-2 text-center">
						<p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
							Pusat Panggilan Antrian Digital
						</p>
						<p
							className={`text-2xl sm:text-3xl xl:text-4xl font-black tracking-tight ${
								isLight ? 'text-slate-900' : 'text-white drop-shadow-sm'
							}`}
						>
							MENUNGGU PANGGILAN
						</p>
						<p className={`mt-1.5 text-xs sm:text-sm font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
							Petugas loket siap memanggil nomor antrian berikutnya
						</p>
					</div>
				)}
			</div>

			{/* History / Tagline Footer */}
			<div
				className={`border-t pt-2.5 text-xs ${
					isLight ? 'border-slate-100 text-slate-600' : 'border-white/10 text-slate-400'
				}`}
			>
				{history.length > 0 ? (
					<div className="flex items-center justify-center gap-2 overflow-hidden">
						<span
							className={`shrink-0 font-black uppercase text-[11px] ${
								isLight ? 'text-slate-700' : 'text-kmenag-gold'
							}`}
						>
							Panggilan Terakhir:
						</span>
						<div className="flex items-center gap-1.5 truncate">
							{history.slice(0, 4).map((h) => (
								<span
									key={h.id}
									className={`rounded-md border px-2.5 py-0.5 font-black text-xs tabular-nums ${
										isLight
											? 'bg-slate-100 border-slate-300 text-slate-900'
											: 'bg-white/10 border-white/10 text-slate-200'
									}`}
								>
									{h.category_code}-{formatTicketNumber(h.ticket_number)}
								</span>
							))}
						</div>
					</div>
				) : (
					<span className={`font-bold text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
						Layanan PTSP Ramah, Cepat, Bebas Pungli & Akuntabel
					</span>
				)}
			</div>
		</div>
	);
}
