import React from 'react';
import { api } from '../../lib/api';
import type { Category, Queue, Stats } from '../../lib/types';
import {
	ChartBarIcon,
	CheckCircleIcon,
	ClockIcon,
	QueueIcon,
	ShieldCheckIcon,
	ArrowPathIcon,
} from '../common/Icons';

interface AdminAnalyticsProps {
	queues: Queue[];
	categories: Category[];
}

export default function AdminAnalytics({ queues, categories }: AdminAnalyticsProps) {
	const [stats, setStats] = React.useState<Stats | null>(null);
	const [loading, setLoading] = React.useState(true);

	const loadStats = React.useCallback(async () => {
		try {
			setLoading(true);
			const data = await api.stats();
			setStats(data);
		} catch (e) {
			console.error('Failed to load stats:', e);
		} finally {
			setLoading(false);
		}
	}, []);

	React.useEffect(() => {
		loadStats();
	}, [loadStats]);

	const safeQueues = Array.isArray(queues) ? queues : [];
	const safeCategories = Array.isArray(categories) ? categories : [];

	const totalToday = stats?.total_today ?? 0;
	const waitingCount = stats?.waiting ?? safeQueues.filter((q) => q && q.status === 'waiting').length;
	const completedCount = stats?.completed ?? 0;
	const avgWait = stats?.avg_wait_min ?? 0;

	return (
		<div className="space-y-8">
			{/* Refresh Header */}
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
						<ChartBarIcon className="h-5 w-5 text-emerald-600" />
						Rekapitulasi Pelayanan Hari Ini
					</h3>
					<p className="text-xs text-slate-500 mt-0.5">
						Data statistik antrian dihitung secara realtime sejak jam buka operasional
					</p>
				</div>
				<button
					type="button"
					onClick={loadStats}
					disabled={loading}
					className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-50"
				>
					<ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
					<span>Segarkan Data</span>
				</button>
			</div>

			{/* Metric KPI Cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
					<div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
						<span>Total Pengunjung</span>
						<QueueIcon className="h-4 w-4 text-emerald-600" />
					</div>
					<div className="mt-3 text-4xl font-black text-slate-900">{totalToday}</div>
					<p className="mt-1 text-[11px] text-slate-400">Total tiket antrian diterbitkan</p>
				</div>

				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
					<div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
						<span>Sedang Menunggu</span>
						<ClockIcon className="h-4 w-4 text-amber-600" />
					</div>
					<div className="mt-3 text-4xl font-black text-amber-600">{waitingCount}</div>
					<p className="mt-1 text-[11px] text-slate-400">Belum dipanggil oleh loket</p>
				</div>

				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
					<div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
						<span>Selesai Dilayani</span>
						<CheckCircleIcon className="h-4 w-4 text-emerald-600" />
					</div>
					<div className="mt-3 text-4xl font-black text-emerald-600">{completedCount}</div>
					<p className="mt-1 text-[11px] text-slate-400">Pengunjung sukses selesai</p>
				</div>

				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
					<div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
						<span>Rata-Rata Tunggu</span>
						<ShieldCheckIcon className="h-4 w-4 text-teal-600" />
					</div>
					<div className="mt-3 text-4xl font-black text-teal-600">
						{avgWait} <span className="text-sm font-sans font-bold text-slate-400">Menit</span>
					</div>
					<p className="mt-1 text-[11px] text-slate-400">Estimasi waktu pelayanan</p>
				</div>
			</div>

			{/* Category Distribution Breakdown */}
			<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
				<h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 mb-4">
					Distribusi Antrian Berdasarkan Seksi Layanan
				</h4>

				<div className="space-y-4">
					{safeCategories.map((cat) => {
						const countInCat = safeQueues.filter((q) => q && (q.category_id === cat.id || q.category_code === cat.code)).length;
						const percentage = totalToday > 0 ? Math.round((countInCat / totalToday) * 100) : 0;

						return (
							<div key={cat.id} className="space-y-1.5">
								<div className="flex items-center justify-between text-xs">
									<span className="font-bold text-slate-800">
										<span className="text-emerald-700 mr-2 font-bold">[{cat.code}]</span>
										{cat.name}
									</span>
									<span className="font-semibold text-slate-500">
										{countInCat} Tiket ({percentage}%)
									</span>
								</div>
								<div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
									<div
										className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-500"
										style={{ width: `${Math.max(percentage, countInCat > 0 ? 5 : 0)}%` }}
									/>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
