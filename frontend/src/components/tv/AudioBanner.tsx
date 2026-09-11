import React from 'react';
import { BellIcon, VolumeUpIcon } from '../common/Icons';

interface AudioBannerProps {
	unlocked: boolean;
	onEnable: () => void;
}

export default function AudioBanner({ unlocked, onEnable }: AudioBannerProps) {
	if (unlocked) return null;

	return (
		<div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-4 py-2 text-slate-950 shadow-lg">
			<div className="mx-auto flex max-w-7xl items-center justify-between">
				<div className="flex items-center gap-3">
					<BellIcon className="h-5 w-5 shrink-0 text-slate-950" />
					<p className="text-xs font-bold sm:text-sm text-slate-950">
						Layar TV memerlukan izin audio browser untuk memutar nada bel dan panggilan suara antrian.
					</p>
				</div>
				<button
					type="button"
					onClick={onEnable}
					className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-1.5 text-xs font-extrabold text-white shadow hover:bg-slate-900 transition-all cursor-pointer"
				>
					<VolumeUpIcon className="h-4 w-4" />
					<span>Aktifkan Audio</span>
				</button>
			</div>
		</div>
	);
}
