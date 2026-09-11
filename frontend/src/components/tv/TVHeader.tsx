import React from 'react';
import { formatDateID, formatTimeWIB } from '../../lib/format';
import { VolumeUpIcon, VolumeMuteIcon, FullscreenIcon, ExitFullscreenIcon } from '../common/Icons';

interface TVHeaderProps {
	connected: boolean;
	now: Date;
	audioEnabled: boolean;
	onToggleAudio: () => void;
	onToggleFullscreen: () => void;
}

export default function TVHeader({
	connected,
	now,
	audioEnabled,
	onToggleAudio,
	onToggleFullscreen,
}: TVHeaderProps) {
	const timeStr = formatTimeWIB(now);
	const dateStr = formatDateID(now);
	const [isFullscreen, setIsFullscreen] = React.useState(false);

	const handleFullscreenToggle = () => {
		onToggleFullscreen();
		setIsFullscreen(Boolean(document.fullscreenElement));
	};

	return (
		<header
			className="flex h-20 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/95 px-6 backdrop-blur-xl shadow-md"
			style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)' }}
		>
			{/* Logo & Agency Identity */}
			<div className="flex items-center gap-4">
				<img
					src="/kemenag.svg"
					alt="Logo Kemenag RI"
					className="h-12 w-12 shrink-0 drop-shadow-[0_0_16px_rgba(255,199,44,0.4)]"
				/>
				<div className="leading-tight">
					<h1 className="text-lg font-black tracking-wide text-white sm:text-xl">
						KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA
					</h1>
					<p className="flex items-center gap-2 text-xs font-bold tracking-widest text-kmenag-gold uppercase sm:text-sm">
						<span>Pelayanan Terpadu Satu Pintu (PTSP)</span>
						<span className="text-slate-500">•</span>
						<span className="text-emerald-400">IKHLAS BERAMAL</span>
					</p>
				</div>
			</div>

			{/* Center: Operational & Realtime Status */}
			<div className="hidden items-center gap-3 md:flex">
				<span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold tracking-wider text-emerald-400 uppercase">
					<span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
					LOKET BUKA
				</span>
				<span
					className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
						connected
							? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
							: 'border-rose-500/20 bg-rose-500/10 text-rose-300'
					}`}
				>
					<span
						className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'}`}
					/>
					{connected ? 'Online Realtime' : 'Menghubungkan...'}
				</span>
			</div>

			{/* Right: Digital Clock & Dedicated TV Controls (Mute & Fullscreen ONLY) */}
			<div className="flex items-center gap-4">
				<div className="text-right">
					<p className="text-2xl font-black tracking-tight text-white tabular-nums sm:text-3xl">
						{timeStr} <span className="text-xs font-bold text-kmenag-gold">WIB</span>
					</p>
					<p className="text-xs font-medium text-slate-400">{dateStr}</p>
				</div>

				{/* Pure TV Operator Controls: Mute & Fullscreen Only */}
				<div className="flex items-center gap-2 border-l border-white/10 pl-3">
					{/* Audio Mute/Unmute */}
					<button
						type="button"
						onClick={onToggleAudio}
						title={audioEnabled ? 'Matikan Suara Panggilan' : 'Aktifkan Suara Panggilan'}
						className={`rounded-xl p-2.5 transition-all ${
							audioEnabled
								? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 ring-1 ring-emerald-500/40'
								: 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 animate-pulse ring-1 ring-rose-500/40'
						}`}
					>
						{audioEnabled ? <VolumeUpIcon className="h-5 w-5" /> : <VolumeMuteIcon className="h-5 w-5" />}
					</button>

					{/* Fullscreen Toggle */}
					<button
						type="button"
						onClick={handleFullscreenToggle}
						title="Layar Penuh (F11)"
						className="rounded-xl bg-white/5 p-2.5 text-slate-300 hover:bg-white/10 hover:text-white transition-all"
					>
						{isFullscreen ? <ExitFullscreenIcon className="h-5 w-5" /> : <FullscreenIcon className="h-5 w-5" />}
					</button>
				</div>
			</div>
		</header>
	);
}
