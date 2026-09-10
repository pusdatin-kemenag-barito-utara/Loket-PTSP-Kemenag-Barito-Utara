interface LogoProps {
	compact?: boolean;
}

export default function Logo({ compact = false }: LogoProps) {
	return (
		<div className="flex items-center gap-3">
			<img
				src="/kemenag.svg"
				alt="Kemenag"
				className="h-10 w-10 shrink-0 drop-shadow-[0_0_12px_rgba(255,199,44,0.35)]"
			/>
			{!compact && (
				<div className="leading-tight">
					<p className="text-sm font-bold text-white">Loket PTSP</p>
					<p className="text-xs text-slate-400">Kemenag Barito Utara</p>
				</div>
			)}
		</div>
	);
}