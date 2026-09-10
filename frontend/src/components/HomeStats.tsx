import React from 'react';
import { api } from '../lib/api';
import type { Stats } from '../lib/types';

const POLL_INTERVAL_MS = 10_000;

const initialStats: Stats = {
	total_today: 0,
	waiting: 0,
	called: 0,
	completed: 0,
	avg_wait_min: 0,
	next_number: 0,
	open: true,
	is_operational: true,
};

function StatCard({ label, value, accent = 'gold' }: { label: string; value: string | number; accent?: 'gold' | 'green' | 'white' }) {
	const color =
		accent === 'gold' ? 'bg-kmenag-gold/10 text-kmenag-gold' : accent === 'green' ? 'bg-kmenag-green-light/10 text-kmenag-green-light' : 'bg-white/5 text-slate-200';
	return (
		<div className="glass rounded-2xl p-5">
			<p className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${color}`}>{label}</p>
			<p className="mt-3 text-3xl font-extrabold text-white tabular-nums">{value}</p>
		</div>
	);
}

export default function HomeStats() {
	const [stats, setStats] = React.useState<Stats>(initialStats);
	const [now, setNow] = React.useState(new Date());

	React.useEffect(() => {
		let cancelled = false;
		const load = async () => {
			try {
				const s = await api.stats();
				if (!cancelled) setStats(s);
			} catch {
				/* keep previous */
			}
		};
		load();
		const t = setInterval(load, POLL_INTERVAL_MS);
		const clock = setInterval(() => setNow(new Date()), 1000);
		return () => {
			cancelled = true;
			clearInterval(t);
			clearInterval(clock);
		};
	}, []);

	const openStatus = stats.is_operational;
	const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

	return (
		<section className="relative">
			<div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
				<div>
					<p className="text-sm text-slate-400">{dateStr}</p>
					<p className="text-4xl font-extrabold text-white tabular-nums">{timeStr}</p>
				</div>
				<span
					className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
						openStatus ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
					}`}
				>
					<span className={`h-2.5 w-2.5 rounded-full ${openStatus ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
					{openStatus ? 'Loket Buka' : 'Loket Tutup'}
				</span>
			</div>

			<div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
				<StatCard label="Antrian Hari Ini" value={stats.total_today} accent="gold" />
				<StatCard label="Menunggu" value={stats.waiting} accent="gold" />
				<StatCard label="Dipanggil" value={stats.called} accent="green" />
				<StatCard label="Selesai" value={stats.completed} accent="green" />
				<StatCard label="Rata-rata Tunggu" value={`${Math.round(stats.avg_wait_min)} mnt`} accent="white" />
			</div>

			<div className="glass mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl p-5 sm:flex-row">
				<div>
					<p className="text-sm text-slate-400">Nomor antrian berikutnya</p>
					<p className="text-2xl font-extrabold text-gradient-gold">Nomor {String(stats.next_number).padStart(3, '0')}</p>
				</div>
				<a href="/kiosk" className="btn btn-gold text-sm">
					Ambil Nomor Antrian →
				</a>
			</div>
		</section>
	);
}