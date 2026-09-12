import React from 'react';
import { formatDateID, formatTimeWIB } from '../../lib/format';
import { VolumeUpIcon, VolumeMuteIcon, FullscreenIcon, ExitFullscreenIcon, SunIcon, MoonIcon } from '../common/Icons';

interface TVHeaderProps {
	connected: boolean;
	now: Date;
	audioEnabled: boolean;
	theme?: 'light' | 'dark';
	onToggleAudio: () => void;
	onToggleFullscreen: () => void;
}

export default function TVHeader({
	connected,
	now,
	audioEnabled,
	theme = 'light',
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

	const isLight = theme === 'light';

	return (
		<header
			className={`flex h-20 shrink-0 items-center justify-between border-b px-6 shadow-xs transition-colors duration-300 select-none ${
				isLight
					? 'border-slate-200 bg-white/95 backdrop-blur-xl'
					: 'border-slate-800 bg-slate-900/95 backdrop-blur-xl'
			}`}
		>
			{/* Logo & Agency Identity */}
			<div className="flex items-center gap-4">
				<img
					src="/kemenag.svg"
					alt="Logo Kemenag RI"
					className={`h-12 w-12 shrink-0 ${
						isLight
							? 'drop-shadow-[0_1px_4px_rgba(0,103,71,0.2)]'
							: 'drop-shadow-[0_0_16px_rgba(255,199,44,0.4)]'
					}`}
				/>
				<div className="leading-tight">
					<h1
						className={`text-lg font-black tracking-wide sm:text-xl ${
							isLight ? 'text-slate-900' : 'text-white'
						}`}
					>
						KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA
					</h1>
					<p className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase sm:text-sm">
						<span className={isLight ? 'text-amber-700 font-extrabold' : 'text-kmenag-gold'}>
							Pelayanan Terpadu Satu Pintu (PTSP)
						</span>
						<span className={isLight ? 'text-slate-400' : 'text-slate-500'}>•</span>
						<span className={isLight ? 'text-emerald-800 font-black' : 'text-emerald-400'}>
							IKHLAS BERAMAL
						</span>
					</p>
				</div>
			</div>

			{/* Center: Branding Motto HAPAKAT */}
			<div className="hidden flex-col items-center justify-center text-center md:flex">
				<img
					src="/logo-hapakat.webp"
					alt="Motto Pelayanan HAPAKAT"
					className="h-8 w-auto object-contain drop-shadow-xs sm:h-9"
				/>
				<p
					className={`mt-1 text-xs font-bold tracking-wide sm:text-[12px] transition-colors ${
						isLight ? 'text-emerald-900' : 'text-emerald-300'
					}`}
				>
					<span className="font-black text-amber-500 text-sm">H</span>armonis,{' '}
					<span className="font-black text-amber-500 text-sm">A</span>manah,{' '}
					<span className="font-black text-amber-500 text-sm">P</span>rofesional,{' '}
					<span className="font-black text-amber-500 text-sm">A</span>kuntabel,{' '}
					<span className="font-black text-amber-500 text-sm">K</span>reatif,{' '}
					<span className="font-black text-amber-500 text-sm">A</span>dil dan{' '}
					<span className="font-black text-amber-500 text-sm">T</span>ransparan
				</p>
			</div>

			{/* Right: Digital Clock & Dedicated TV Controls */}
			<div className="flex items-center gap-4">
				<div className="text-right">
					<p
						className={`text-2xl font-black tracking-tight tabular-nums sm:text-3xl ${
							isLight ? 'text-slate-900' : 'text-white'
						}`}
					>
						{timeStr}{' '}
						<span
							className={`text-xs font-black ${
								isLight ? 'text-emerald-800' : 'text-kmenag-gold'
							}`}
						>
							WIB
						</span>
					</p>
					<p
						className={`flex items-center justify-end gap-1.5 text-xs font-semibold ${
							isLight ? 'text-slate-600' : 'text-slate-400'
						}`}
					>
						<span
							className={`h-2 w-2 rounded-full ${
								connected
									? isLight
										? 'bg-emerald-600'
										: 'bg-emerald-400'
									: 'bg-rose-500 animate-pulse'
							}`}
							title={connected ? 'Terhubung (Realtime)' : 'Terputus (Menghubungkan...)'}
						/>
						{dateStr}
					</p>
				</div>

				{/* Pure TV Operator Controls: Mute & Fullscreen (Theme moved to Admin Panel) */}
				<div
					className={`flex items-center gap-2 border-l pl-3 ${
						isLight ? 'border-slate-200' : 'border-white/10'
					}`}
				>
					{/* Audio Mute/Unmute */}
					<button
						type="button"
						onClick={onToggleAudio}
						title={audioEnabled ? 'Matikan Suara Panggilan' : 'Aktifkan Suara Panggilan'}
						className={`rounded-xl p-2.5 transition-all cursor-pointer ${
							audioEnabled
								? isLight
									? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
									: 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 ring-1 ring-emerald-500/40'
								: isLight
								? 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
								: 'bg-slate-800 text-slate-300 hover:bg-slate-700 ring-1 ring-slate-700'
						}`}
					>
						{audioEnabled ? <VolumeUpIcon className="h-5 w-5" /> : <VolumeMuteIcon className="h-5 w-5" />}
					</button>

					{/* Fullscreen Toggle */}
					<button
						type="button"
						onClick={handleFullscreenToggle}
						title="Layar Penuh (F11)"
						className={`rounded-xl p-2.5 transition-all cursor-pointer ${
							isLight
								? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
								: 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
						}`}
					>
						{isFullscreen ? <ExitFullscreenIcon className="h-5 w-5" /> : <FullscreenIcon className="h-5 w-5" />}
					</button>
				</div>
			</div>
		</header>
	);
}
