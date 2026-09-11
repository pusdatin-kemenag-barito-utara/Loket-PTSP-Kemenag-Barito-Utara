import React from 'react';
import { api } from '../lib/api';
import { connectRealtime } from '../lib/realtime';

const PUSDATIN_MAINTENANCE_URL =
	'https://pusdatin.kemenag-baritoutara.com/maintenance?app=loket_ptsp_kemenag';

/**
 * MaintenanceBlocker:
 * 1. Checks maintenance status dynamically on initial mount (with 5-minute sessionStorage cache).
 * 2. Connects to backend WebSocket to listen for 'maintenance_changed' events in realtime,
 *    eliminating repetitive HTTP polling and saving VPS resources.
 * 3. Renders the official Pusdatin maintenance UI (official iframe with authentic native fallback).
 */
export default function MaintenanceBlocker() {
	const [maintenance, setMaintenance] = React.useState(false);
	const [iframeLoaded, setIframeLoaded] = React.useState(false);

	React.useEffect(() => {
		let cancelled = false;

		// 1. Initial check (uses sessionStorage cache to prevent repeated API calls)
		const check = async () => {
			try {
				const cached = sessionStorage.getItem('pusdatin_maint_status');
				const cachedTime = sessionStorage.getItem('pusdatin_maint_time');
				if (cached !== null && cachedTime && Date.now() - Number(cachedTime) < 300_000) {
					if (!cancelled) setMaintenance(cached === 'true');
					return;
				}

				const res = await api.maintenance();
				if (!cancelled) {
					setMaintenance(res.maintenance);
					sessionStorage.setItem('pusdatin_maint_status', String(res.maintenance));
					sessionStorage.setItem('pusdatin_maint_time', String(Date.now()));
				}
			} catch {
				// Backend unreachable: don't block
			}
		};

		check();

		// 2. Realtime WebSocket listener: reacts immediately when status changes in database
		const conn = connectRealtime((msg) => {
			if (msg.type === 'maintenance_changed') {
				const data = msg.data as { maintenance: boolean } | undefined;
				const isMaint = Boolean(data?.maintenance);
				if (!cancelled) {
					setMaintenance(isMaint);
					sessionStorage.setItem('pusdatin_maint_status', String(isMaint));
					sessionStorage.setItem('pusdatin_maint_time', String(Date.now()));
				}
			}
		});

		return () => {
			cancelled = true;
			conn.close();
		};
	}, []);

	if (!maintenance) return null;

	return (
		<div className="fixed inset-0 z-[99999] h-screen w-screen overflow-hidden bg-slate-50 font-sans">
			{/* Official Pusdatin iframe for 100% exact styling & dynamic content */}
			<iframe
				src={PUSDATIN_MAINTENANCE_URL}
				onLoad={() => setIframeLoaded(true)}
				className={`h-full w-full border-0 outline-none transition-opacity duration-300 ${
					iframeLoaded ? 'opacity-100' : 'opacity-0'
				}`}
				title="Pusdatin Official Maintenance Page"
			/>

			{/* Authentic Pusdatin Standalone Fallback UI (displayed while loading or if offline) */}
			{!iframeLoaded && (
				<div className="absolute inset-0 flex items-center justify-center bg-slate-50 px-6 py-12">
					<div className="pointer-events-none absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-emerald-500/15 blur-[90px]" />
					<div className="pointer-events-none absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-blue-500/15 blur-[90px]" />

					<div className="relative z-10 mx-auto max-w-xl text-center">
						<div className="mb-6 flex justify-center">
							<div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/60">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="48"
									height="48"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="text-emerald-600"
								>
									<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
									<circle cx="12" cy="12" r="3" />
								</svg>
								<div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="20"
										height="20"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z" />
									</svg>
								</div>
							</div>
						</div>

						<h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
							Sistem Sedang Pemeliharaan
						</h1>

						<p className="mb-8 text-base leading-relaxed text-slate-600">
							Aplikasi <strong className="text-slate-800">Loket Layanan PTSP</strong> saat ini sedang dalam mode perbaikan
							terpusat oleh Tim Pusdatin Kemenag Barito Utara. Kami sedang melakukan peningkatan sistem untuk memberikan
							pengalaman yang lebih baik.
						</p>

						<div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
							<div className="flex items-center gap-2 rounded-full border border-amber-200/60 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
									<path d="M12 9v4" />
									<path d="M12 17h.01" />
								</svg>
								<span>Akses Sementara Ditutup</span>
							</div>
							<div className="flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<circle cx="12" cy="12" r="10" />
									<path d="M12 6v6l4 2" />
								</svg>
								<span>Silakan periksa kembali nanti</span>
							</div>
						</div>

						<div className="mt-12 text-xs font-medium text-slate-400">
							&copy; {new Date().getFullYear()} Pusdatin Kemenag Barito Utara
						</div>
					</div>
				</div>
			)}
		</div>
	);
}