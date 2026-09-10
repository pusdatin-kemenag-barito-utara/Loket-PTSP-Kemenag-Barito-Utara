import React from 'react';
import { api } from '../lib/api';

const POLL_INTERVAL_MS = 30_000;

/**
 * Polls the maintenance endpoint and blocks the whole screen with an overlay
 * when the satellite app is flagged as under maintenance.
 */
export default function MaintenanceBlocker() {
	const [maintenance, setMaintenance] = React.useState(false);

	React.useEffect(() => {
		let cancelled = false;

		const check = async () => {
			try {
				const res = await api.maintenance();
				if (!cancelled) setMaintenance(res.maintenance);
			} catch {
				// API unreachable: don't block the app.
			}
		};

		check();
		const t = setInterval(check, POLL_INTERVAL_MS);
		return () => {
			cancelled = true;
			clearInterval(t);
		};
	}, []);

	if (!maintenance) return null;

	return (
		<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-night-950/95 backdrop-blur-xl">
			<div className="glass-gold mx-4 max-w-md rounded-3xl p-8 text-center">
				<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-kmenag-gold/20 text-3xl">
					⚠️
				</div>
				<h2 className="text-xl font-bold text-white">Sedang Dalam Pemeliharaan</h2>
				<p className="mt-2 text-sm text-slate-400">
					Sistem sedang dalam masa pemeliharaan. Mohon kembali beberapa saat lagi. Terima kasih atas pengertian Anda.
				</p>
			</div>
		</div>
	);
}