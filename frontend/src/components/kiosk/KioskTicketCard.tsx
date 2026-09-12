import React from 'react';
import type { Queue } from '../../lib/types';
import { formatTicketNumber, formatDateID, formatTimeWIB } from '../../lib/format';
import { PrinterIcon, CheckCircleIcon, ArrowRightIcon } from '../common/Icons';

interface KioskTicketCardProps {
	ticket: Queue;
	autoPrint?: boolean;
	onReset: () => void;
}

export default function KioskTicketCard({ ticket, autoPrint = false, onReset }: KioskTicketCardProps) {
	const COUNTDOWN_INITIAL = 8;
	const [timeLeft, setTimeLeft] = React.useState(COUNTDOWN_INITIAL);
	const [hasPrinted, setHasPrinted] = React.useState(false);
	const printedRef = React.useRef(false);

	const ticketDate = ticket.created_at ? new Date(ticket.created_at) : new Date();
	const formattedTime = formatTimeWIB(ticketDate);
	const formattedDate = formatDateID(ticketDate);

	// Play pleasant acoustic ticket chime via Web Audio API
	React.useEffect(() => {
		try {
			const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			if (AudioCtx) {
				const ctx = new AudioCtx();
				const now = ctx.currentTime;

				const osc1 = ctx.createOscillator();
				const osc2 = ctx.createOscillator();
				const gain = ctx.createGain();

				osc1.type = 'sine';
				osc1.frequency.setValueAtTime(587.33, now); // D5
				osc1.frequency.setValueAtTime(880, now + 0.12); // A5

				osc2.type = 'triangle';
				osc2.frequency.setValueAtTime(587.33, now);
				osc2.frequency.setValueAtTime(880, now + 0.12);

				gain.gain.setValueAtTime(0.2, now);
				gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

				osc1.connect(gain);
				osc2.connect(gain);
				gain.connect(ctx.destination);

				osc1.start(now);
				osc2.start(now);
				osc1.stop(now + 0.5);
				osc2.stop(now + 0.5);
			}
		} catch {
			/* audio autoplay policy fallback */
		}
	}, []);

	// Auto-print trigger if enabled in kiosk settings
	React.useEffect(() => {
		if (autoPrint && !printedRef.current) {
			printedRef.current = true;
			const timer = setTimeout(() => {
				window.print();
				setHasPrinted(true);
			}, 600);
			return () => clearTimeout(timer);
		}
	}, [autoPrint]);

	// Auto reset countdown timer for next visitor
	React.useEffect(() => {
		const interval = setInterval(() => {
			setTimeLeft((prev) => {
				if (prev <= 1) {
					clearInterval(interval);
					onReset();
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [onReset]);

	const handleManualPrint = () => {
		window.print();
		setHasPrinted(true);
	};

	const formattedNumber = `${ticket.category_code} - ${formatTicketNumber(ticket.ticket_number)}`;

	return (
		<div className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-6 select-none animate-fade-in">
			{/* Top Success Banner */}
			<div className="mb-4 flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs sm:text-sm font-bold text-emerald-800 shadow-xs">
				<CheckCircleIcon className="h-4 w-4 text-emerald-600" />
				<span>Nomor Antrian Berhasil Diterbitkan!</span>
			</div>

			{/* ========================================================================= */}
			{/* PHYSICAL THERMAL RECEIPT CARD (Target for @media print via #kiosk-printable-receipt) */}
			{/* ========================================================================= */}
			<div
				id="kiosk-printable-receipt"
				className="relative w-full max-w-sm sm:max-w-md rounded-3xl border-2 border-slate-300 bg-white p-6 sm:p-8 text-center shadow-xl"
			>
				{/* Header: Official Agency Logo & Title */}
				<div className="flex flex-col items-center">
					<img
						src="/kemenag.svg"
						alt="Logo Kemenag"
						className="h-12 w-12 object-contain filter drop-shadow-xs"
					/>
					<h3 className="mt-2 text-xs sm:text-sm font-black tracking-tight text-slate-900 uppercase">
						KANTOR KEMENTERIAN AGAMA
					</h3>
					<h4 className="text-[11px] sm:text-xs font-bold text-slate-800 uppercase">
						KABUPATEN BARITO UTARA
					</h4>
					<p className="mt-0.5 text-[10px] font-extrabold tracking-wider text-emerald-800 uppercase">
						PELAYANAN TERPADU SATU PINTU (PTSP)
					</p>
					<p className="text-[9px] text-slate-500 font-medium">
						Jl. Ahmad Yani No. 84, Muara Teweh, Kalimantan Tengah
					</p>
				</div>

				{/* Dashed divider line (thermal cut line) */}
				<div className="my-4 border-b-2 border-dashed border-slate-300" />

				{/* Ticket Information */}
				<div>
					<p className="text-xs font-black uppercase tracking-widest text-slate-500">
						NOMOR ANTRIAN ANDA
					</p>
					<div className="my-2 rounded-2xl bg-slate-50 py-3 border border-slate-200">
						<p className="text-5xl sm:text-6xl font-black tracking-tight text-emerald-800 tabular-nums">
							{formattedNumber}
						</p>
					</div>
					<div className="mt-2">
						<p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
							LOKET TUJUAN
						</p>
						<p className="text-base sm:text-lg font-black text-slate-900 mt-0.5 leading-snug">
							{ticket.category_name}
						</p>
					</div>
				</div>

				{/* Date & Time */}
				<div className="mt-3 flex items-center justify-between border-t border-b border-slate-100 py-2 text-[11px] font-semibold text-slate-600">
					<span>{formattedDate}</span>
					<span className="font-bold text-slate-800">{formattedTime} WIB</span>
				</div>

				{/* Notice Box */}
				<div className="mt-4 rounded-xl bg-emerald-50/70 border border-emerald-200 p-3 text-left text-[11px] font-medium text-emerald-950 space-y-1">
					<p className="font-bold text-emerald-900 flex items-center gap-1.5">
						<span>•</span> Simpan struk fisik ini hingga nomor dipanggil.
					</p>
					<p>
						<span>•</span> Pantau panggilan nomor Anda di layar monitor ruang tunggu PTSP.
					</p>
					<p>
						<span>•</span> Layanan PTSP Kemenag Barito Utara <strong>GRATIS (Bebas Pungli)</strong>.
					</p>
				</div>

				{/* Thermal Footer */}
				<div className="mt-4 border-t border-dashed border-slate-300 pt-3 text-[10px] text-slate-500 font-medium">
					<p className="font-bold text-slate-700">Motto Pelayanan HAPAKAT</p>
					<p className="italic text-[9px] text-slate-600">
						Harmonis • Amanah • Profesional • Akuntabel • Kreatif • Adil • Transparan
					</p>
					<p className="mt-1 font-semibold text-slate-700">
						*** Terima Kasih Atas Kunjungan Anda ***
					</p>
				</div>
			</div>

			{/* ========================================================================= */}
			{/* SCREEN-ONLY TOUCH CONTROLS (Hidden on Print) */}
			{/* ========================================================================= */}
			<div className="mt-6 w-full max-w-sm sm:max-w-md space-y-3 no-print">
				{/* Main Touch Buttons */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{/* Print Button */}
					<button
						type="button"
						onClick={handleManualPrint}
						className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black py-4 px-4 text-sm sm:text-base shadow-lg shadow-emerald-700/25 transition-all cursor-pointer"
					>
						<PrinterIcon className="h-5 w-5 shrink-0" />
						<span>{hasPrinted ? 'Cetak Ulang Struk' : 'Cetak Struk Tiket'}</span>
					</button>

					{/* Finish / Next Visitor Button */}
					<button
						type="button"
						onClick={onReset}
						className="flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white hover:bg-slate-100 active:scale-95 text-slate-800 font-black py-4 px-4 text-sm sm:text-base shadow-sm transition-all cursor-pointer"
					>
						<span>Selesai</span>
						<ArrowRightIcon className="h-5 w-5 shrink-0 text-slate-600" />
					</button>
				</div>

				{/* Auto-Reset Countdown Progress */}
				<div className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-xs">
					<div className="flex items-center justify-between text-xs font-bold text-slate-600">
						<span>Kembali ke menu layanan dalam:</span>
						<span className="rounded-md bg-emerald-100 px-2 py-0.5 font-black text-emerald-800 tabular-nums">
							{timeLeft} detik
						</span>
					</div>
					{/* Progress Bar */}
					<div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
						<div
							className="h-full bg-emerald-600 transition-all duration-1000 ease-linear"
							style={{ width: `${(timeLeft / COUNTDOWN_INITIAL) * 100}%` }}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

