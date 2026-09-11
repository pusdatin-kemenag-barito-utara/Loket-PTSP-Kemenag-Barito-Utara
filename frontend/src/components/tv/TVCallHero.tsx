import React from 'react';
import type { Queue } from '../../lib/types';
import { formatTicketNumber } from '../../lib/format';
import { ArrowRightIcon } from '../common/Icons';

interface TVCallHeroProps {
	current: Queue | null;
	isRecentlyCalled: boolean;
	history: Queue[];
}

export default function TVCallHero({ current, isRecentlyCalled, history }: TVCallHeroProps) {
	return (
		<div
			className={`relative flex flex-col justify-between overflow-hidden rounded-3xl border p-6 text-center transition-all duration-500 ${
				current
					? isRecentlyCalled
						? 'animate-pulse-ring border-kmenag-gold bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 shadow-[0_0_50px_rgba(255,199,44,0.3)]'
						: 'border-amber-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 shadow-2xl'
					: 'border-slate-800 bg-slate-900/90 shadow-lg'
			}`}
			style={{ backgroundColor: '#0b1329' }}
		>
			{/* Top Header */}
			<div className="flex items-center justify-between">
				<span className="inline-flex items-center gap-2 rounded-full border border-kmenag-gold/40 bg-kmenag-gold/15 px-3 py-1 text-xs font-black tracking-widest text-kmenag-gold uppercase">
					<span className="h-2 w-2 rounded-full bg-kmenag-gold animate-ping" />
					PANGGILAN AKTIF
				</span>
				<span className="text-xs font-medium text-slate-400">
					{current ? 'Sedang Dilayani' : 'Siap Melayani'}
				</span>
			</div>

			{/* Ticket Big Number Display */}
			<div className="py-4">
				{current ? (
					<div className="space-y-1">
						<p className="text-6xl font-black tracking-tight text-gradient-gold tabular-nums drop-shadow-[0_4px_24px_rgba(255,199,44,0.4)] sm:text-7xl xl:text-8xl">
							{current.category_code} - {formatTicketNumber(current.ticket_number)}
						</p>
						<p className="text-xl font-extrabold text-white sm:text-2xl">
							{current.category_name}
						</p>
						<div className="mt-3 inline-flex items-center gap-2.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/20 px-6 py-2.5 shadow-lg">
							<ArrowRightIcon className="h-5 w-5 text-emerald-300" />
							<span className="text-lg font-black tracking-wider text-emerald-300 uppercase sm:text-xl">
								SILAKAN MENUJU LOKET {current.category_code}
							</span>
						</div>
					</div>
				) : (
					<div className="py-8 text-center">
						<p className="text-3xl font-extrabold text-slate-500 sm:text-4xl">
							MENUNGGU PANGGILAN
						</p>
						<p className="mt-2 text-sm text-slate-400">
							Petugas siap memanggil nomor antrian berikutnya
						</p>
					</div>
				)}
			</div>

			{/* History / Tagline Footer */}
			<div className="border-t border-white/10 pt-3 text-xs text-slate-400">
				{history.length > 0 ? (
					<div className="flex items-center justify-center gap-2 overflow-hidden">
						<span className="shrink-0 font-bold text-kmenag-gold uppercase">Panggilan Terakhir:</span>
						<div className="flex items-center gap-2 truncate">
							{history.slice(0, 3).map((h) => (
								<span
									key={h.id}
									className="rounded-md bg-white/5 px-2 py-0.5 font-bold text-slate-300"
								>
									{h.category_code}-{formatTicketNumber(h.ticket_number)}
								</span>
							))}
						</div>
					</div>
				) : (
					<span>Layanan PTSP Ramah, Bebas Pungli & Akuntabel</span>
				)}
			</div>
		</div>
	);
}
