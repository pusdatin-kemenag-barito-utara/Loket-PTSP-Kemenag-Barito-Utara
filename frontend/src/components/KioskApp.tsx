import React from 'react';
import { api } from '../lib/api';
import { connectRealtime } from '../lib/realtime';
import { formatDateID, formatTimeWIB } from '../lib/format';
import type { Category, Queue, WSMessage } from '../lib/types';
import KioskTicketCard from './kiosk/KioskTicketCard';
import KioskCategoryGrid from './kiosk/KioskCategoryGrid';
import {
	FullscreenIcon,
	ExitFullscreenIcon,
	PrinterIcon,
	HomeIcon,
	ShieldCheckIcon,
} from './common/Icons';

export default function KioskApp() {
	const [categories, setCategories] = React.useState<Category[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);
	const [creating, setCreating] = React.useState(false);
	const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);
	const [ticket, setTicket] = React.useState<Queue | null>(null);
	const [now, setNow] = React.useState(new Date());
	const [isFullscreen, setIsFullscreen] = React.useState(false);
	const [autoPrint, setAutoPrint] = React.useState(false);

	// Initialize auto-print preference from localStorage
	React.useEffect(() => {
		try {
			const saved = localStorage.getItem('kiosk_auto_print');
			if (saved !== null) {
				setAutoPrint(saved === 'true');
			}
		} catch {
			/* ignore */
		}
	}, []);

	const toggleAutoPrint = () => {
		setAutoPrint((prev) => {
			const next = !prev;
			try {
				localStorage.setItem('kiosk_auto_print', String(next));
			} catch {
				/* ignore */
			}
			return next;
		});
	};

	// Clock ticker
	React.useEffect(() => {
		const timer = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(timer);
	}, []);

	// Fullscreen handler
	const toggleFullscreen = () => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().catch(() => {});
			setIsFullscreen(true);
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen().catch(() => {});
				setIsFullscreen(false);
			}
		}
	};

	// Fullscreen change listener
	React.useEffect(() => {
		const handleFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
		document.addEventListener('fullscreenchange', handleFsChange);
		return () => document.removeEventListener('fullscreenchange', handleFsChange);
	}, []);

	// Fetch initial categories
	React.useEffect(() => {
		let cancelled = false;
		api
			.categories()
			.then((cats) => {
				if (!cancelled) setCategories(cats);
			})
			.catch(() => {
				if (!cancelled) setError('Gagal memuat daftar layanan. Mohon periksa koneksi server.');
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	// Realtime Category Sync
	React.useEffect(() => {
		const conn = connectRealtime((msg: WSMessage) => {
			if (msg.type === 'categories_updated') {
				const cats = msg.data as Category[];
				if (Array.isArray(cats)) {
					setCategories(cats.filter((c) => c && c.is_active !== false));
				}
			}
		});
		return () => conn.close();
	}, []);

	const handleTakeTicket = async (category: Category) => {
		if (creating) return;
		setCreating(true);
		setSelectedCategoryId(category.id);
		setError(null);
		try {
			const q = await api.createTicket(category.id);
			setTicket(q);
		} catch {
			setError('Gagal menerbitkan nomor antrian. Mohon coba beberapa saat lagi.');
		} finally {
			setCreating(false);
			setSelectedCategoryId(null);
		}
	};

	if (ticket) {
		return (
			<KioskTicketCard
				ticket={ticket}
				autoPrint={autoPrint}
				onReset={() => setTicket(null)}
			/>
		);
	}

	const timeStr = formatTimeWIB(now);
	const dateStr = formatDateID(now);

	return (
		<div className="flex min-h-screen flex-col justify-between select-none">
			{/* ========================================================================= */}
			{/* TOP KIOSK HEADER BAR (Tablet Optimized) */}
			{/* ========================================================================= */}
			<header className="sticky top-0 z-20 flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 shadow-xs backdrop-blur-md">
				{/* Left: Agency Identity */}
				<div className="flex items-center gap-3 sm:gap-4">
					<img
						src="/kemenag.svg"
						alt="Logo Kemenag"
						className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 drop-shadow-[0_1px_4px_rgba(0,103,71,0.2)]"
					/>
					<div className="leading-tight">
						<h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 line-clamp-1">
							KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA
						</h1>
						<p className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase text-slate-500">
							<span className="text-amber-700 font-extrabold">PELAYANAN TERPADU SATU PINTU (PTSP)</span>
							<span>•</span>
							<span className="text-emerald-800 font-black">MESIN TIKET MANDIRI</span>
						</p>
					</div>
				</div>

				{/* Center: Hapakat Branding (Visible on Tablets & Desktops) */}
				<div className="hidden lg:flex flex-col items-center justify-center text-center">
					<img
						src="/logo-hapakat.webp"
						alt="HAPAKAT"
						className="h-7 w-auto object-contain drop-shadow-xs"
					/>
					<p className="mt-0.5 text-[11px] font-bold text-emerald-900 tracking-wide">
						<span className="text-amber-500 font-black">H</span>armonis,{' '}
						<span className="text-amber-500 font-black">A</span>manah,{' '}
						<span className="text-amber-500 font-black">P</span>rofesional,{' '}
						<span className="text-amber-500 font-black">A</span>kuntabel,{' '}
						<span className="text-amber-500 font-black">K</span>reatif,{' '}
						<span className="text-amber-500 font-black">A</span>dil dan{' '}
						<span className="text-amber-500 font-black">T</span>ransparan
					</p>
				</div>

				{/* Right: Digital Clock & Touchscreen Controls */}
				<div className="flex items-center gap-3">
					{/* Realtime Clock */}
					<div className="text-right hidden sm:block">
						<p className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums leading-none">
							{timeStr} <span className="text-xs font-black text-emerald-800">WIB</span>
						</p>
						<p className="text-xs font-semibold text-slate-500 mt-0.5">{dateStr}</p>
					</div>

					{/* Touch Tablet Controls */}
					<div className="flex items-center gap-1.5 border-l border-slate-200 pl-2 sm:pl-3">
						{/* Auto-Print Toggle Button */}
						<button
							type="button"
							onClick={toggleAutoPrint}
							title={autoPrint ? 'Cetak Struk Otomatis: AKTIF (Klik untuk nonaktifkan)' : 'Cetak Struk Otomatis: NONAKTIF (Klik untuk aktifkan)'}
							className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold transition-all cursor-pointer border ${
								autoPrint
									? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
									: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
							}`}
						>
							<PrinterIcon className="h-4 w-4 shrink-0" />
							<span className="hidden md:inline">{autoPrint ? 'Auto-Print: ON' : 'Auto-Print: OFF'}</span>
						</button>

						{/* Fullscreen Button */}
						<button
							type="button"
							onClick={toggleFullscreen}
							title="Layar Penuh Kiosk (F11)"
							className="rounded-xl border border-slate-200 bg-slate-100 p-2 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
						>
							{isFullscreen ? (
								<ExitFullscreenIcon className="h-5 w-5" />
							) : (
								<FullscreenIcon className="h-5 w-5" />
							)}
						</button>

						{/* Home / Exit Button */}
						<a
							href="/"
							title="Kembali ke Beranda"
							className="rounded-xl border border-slate-200 bg-slate-100 p-2 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
						>
							<HomeIcon className="h-5 w-5" />
						</a>
					</div>
				</div>
			</header>

			{/* ========================================================================= */}
			{/* MAIN SERVICE SELECTION BODY */}
			{/* ========================================================================= */}
			<div className="flex flex-1 flex-col items-center justify-center py-6 sm:py-8 px-4">
				{/* Section Hero Banner */}
				<div className="mb-6 sm:mb-8 text-center max-w-2xl mx-auto">
					<div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-4 py-1.5 text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-800 shadow-xs">
						<span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
						PILIH LAYANAN PTSP
					</div>
					<h2 className="mt-3 text-2xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight">
						Layanan Apa yang Anda Butuhkan?
					</h2>
					<p className="mt-2 text-xs sm:text-sm font-semibold text-slate-600">
						Sentuh salah satu kotak layanan di bawah untuk mengambil dan mencetak struk nomor antrian Anda.
					</p>
				</div>

				{/* Error Notice */}
				{error && (
					<div className="mb-6 w-full max-w-xl rounded-2xl bg-rose-50 border border-rose-200 p-4 text-center text-sm font-bold text-rose-700 shadow-xs animate-fade-in">
						{error}
					</div>
				)}

				{/* Service Categories Grid */}
				{loading ? (
					<div className="flex flex-col items-center justify-center py-16 text-slate-500">
						<span className="h-8 w-8 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin mb-3" />
						<p className="text-sm font-bold">Memuat daftar layanan antrian PTSP...</p>
					</div>
				) : (
					<KioskCategoryGrid
						categories={categories}
						creating={creating}
						selectedCategoryId={selectedCategoryId}
						onSelectCategory={handleTakeTicket}
					/>
				)}
			</div>

			{/* ========================================================================= */}
			{/* BOTTOM KIOSK FOOTER BAR */}
			{/* ========================================================================= */}
			<footer className="border-t border-slate-200 bg-white py-3.5 px-4 text-center shadow-xs select-none">
				<div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-2 text-xs font-semibold text-slate-500">
					<div className="flex items-center gap-2">
						<ShieldCheckIcon className="h-4 w-4 text-emerald-600 shrink-0" />
						<span>Pelayanan Terpadu Satu Pintu Kemenag Barito Utara — <strong>Bebas Pungli & 100% Gratis</strong></span>
					</div>
					<div className="text-[11px] text-slate-400">
						Sentuh layar dengan satu jari • Mesin Cetak Tiket Antrian Digital
					</div>
				</div>
			</footer>
		</div>
	);
}