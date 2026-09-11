import React from 'react';
import { MegaphoneIcon } from '../common/Icons';

interface TVTickerProps {
	runningText: string;
}

export default function TVTicker({ runningText }: TVTickerProps) {
	return (
		<footer
			className="flex h-12 shrink-0 items-center border-t border-slate-800 bg-slate-950 shadow-2xl select-none"
			style={{ backgroundColor: '#020617' }}
		>
			{/* Ticker Label Badge */}
			<div className="flex h-full shrink-0 items-center gap-2 border-r border-white/10 bg-gradient-to-r from-kmenag-green-dark to-kmenag-green px-5 text-xs font-black tracking-wider text-white uppercase shadow-md">
				<MegaphoneIcon className="h-4 w-4" />
				<span>INFORMASI PTSP</span>
			</div>

			{/* Smooth Continuous Seamless Infinite Marquee */}
			<div className="group relative flex flex-1 overflow-hidden">
				{/* Track 1 */}
				<div className="flex shrink-0 animate-marquee-seamless items-center whitespace-nowrap py-1 font-medium text-slate-200">
					<span className="mx-6 text-sm font-semibold tracking-wide">{runningText}</span>
					<span className="mx-6 text-sm font-bold tracking-wide text-kmenag-gold">
						• KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA •
					</span>
					<span className="mx-6 text-sm font-semibold tracking-wide">{runningText}</span>
					<span className="mx-6 text-sm font-bold tracking-wide text-kmenag-gold">
						• KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA •
					</span>
				</div>
				{/* Track 2 (Duplicate for seamless infinite loop without blank gap) */}
				<div className="flex shrink-0 animate-marquee-seamless items-center whitespace-nowrap py-1 font-medium text-slate-200" aria-hidden="true">
					<span className="mx-6 text-sm font-semibold tracking-wide">{runningText}</span>
					<span className="mx-6 text-sm font-bold tracking-wide text-kmenag-gold">
						• KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA •
					</span>
					<span className="mx-6 text-sm font-semibold tracking-wide">{runningText}</span>
					<span className="mx-6 text-sm font-bold tracking-wide text-kmenag-gold">
						• KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA •
					</span>
				</div>
			</div>
		</footer>
	);
}
