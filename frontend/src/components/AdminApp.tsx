import React from 'react';
import { api } from '../lib/api';
import { connectRealtime } from '../lib/realtime';
import type { Category, Queue, User, WSMessage } from '../lib/types';

function formatNumber(n: number) {
	return String(n).padStart(3, '0');
}

export default function AdminApp() {
	const [user, setUser] = React.useState<User | null>(null);
	const [queues, setQueues] = React.useState<Queue[]>([]);
	const [categories, setCategories] = React.useState<Category[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [acting, setActing] = React.useState<string | null>(null);
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		let cancelled = false;
		const load = async () => {
			try {
				const [me, waiting, cats] = await Promise.all([api.me(), api.waiting(), api.categories()]);
				if (cancelled) return;
				setUser(me);
				setQueues(waiting);
				setCategories(cats);
			} catch (err) {
				if (err instanceof Error && 'status' in err && (err as { status: number }).status === 401) {
					window.location.href = '/login';
					return;
				}
				setError('Gagal memuat data.');
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, []);

	React.useEffect(() => {
		const conn = connectRealtime((msg: WSMessage) => {
			const q = msg.data as Queue;
			if (msg.type === 'queue_created') {
				setQueues((qs) => [...qs, q].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)));
			} else if (msg.type === 'queue_called' || msg.type === 'queue_recalled') {
				setQueues((qs) => [q, ...qs.filter((x) => x.id !== q.id)]);
			} else if (msg.type === 'queue_completed' || msg.type === 'queue_skipped') {
				setQueues((qs) => qs.filter((x) => x.id !== q.id));
			}
		});
		return () => conn.close();
	}, []);

	const action = async (queueId: string, fn: () => Promise<Queue>) => {
		setActing(queueId);
		setError(null);
		try {
			const updated = await fn();
			if (updated.status === 'waiting' || updated.status === 'called') {
				setQueues((qs) => [updated, ...qs.filter((x) => x.id !== updated.id)]);
			} else {
				setQueues((qs) => qs.filter((x) => x.id !== queueId));
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Aksi gagal.');
		} finally {
			setActing(null);
		}
	};

	const logout = async () => {
		try {
			await api.logout();
		} finally {
			window.location.href = '/login';
		}
	};

	const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—';

	if (loading) {
		return <p className="py-20 text-center text-slate-500">Memuat...</p>;
	}

	return (
		<div className="mx-auto max-w-5xl px-4 py-10">
			<div className="mb-8 flex items-center justify-between">
				<div>
					<p className="text-sm text-slate-400">Selamat datang,</p>
					<h1 className="text-2xl font-extrabold text-white">{user?.name ?? 'Petugas'}</h1>
				</div>
				<button onClick={logout} className="btn btn-ghost px-4 py-2 text-sm">
					Keluar
				</button>
			</div>

			{error && (
				<p className="mb-6 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
					{error}
				</p>
			)}

			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				{categories.map((c) => (
					<div key={c.id} className="glass rounded-2xl p-4">
						<p className="text-xs text-slate-400">{c.code} — {c.name}</p>
						<p className="mt-1 text-2xl font-extrabold text-kmenag-gold tabular-nums">
							{queues.filter((q) => q.category_id === c.id).length}
						</p>
					</div>
				))}
			</div>

			<h2 className="mb-4 mt-10 text-lg font-bold text-white">Daftar Antrian</h2>

			{queues.length === 0 ? (
				<div className="glass rounded-2xl py-12 text-center text-slate-500">
					Tidak ada antrian yang menunggu.
				</div>
			) : (
				<div className="flex flex-col gap-3">
					{queues.map((q) => (
						<div key={q.id} className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<p className="text-xl font-extrabold text-white">
									{q.category_code}
									<span className="tabular-nums">{formatNumber(q.ticket_number)}</span>
									<span className="ml-3 text-sm font-normal text-slate-400">{categoryName(q.category_id)}</span>
								</p>
								<p className="mt-0.5 text-xs text-slate-500">
									{q.source === 'kiosk' ? 'Kiosk' : 'Admin'}
									{q.called_at ? <span className="ml-2 text-kmenag-gold">Dipanggil</span> : null}
								</p>
							</div>

							<div className="flex flex-wrap gap-2">
								{q.status === 'waiting' && (
									<button
										disabled={acting === q.id}
										onClick={() => action(q.id, () => api.callQueue(q.id))}
										className="btn btn-green px-4 py-2 text-sm"
									>
										Panggil
									</button>
								)}
								{q.status === 'called' && (
									<>
										<button
											disabled={acting === q.id}
											onClick={() => action(q.id, () => api.recallQueue(q.id))}
											className="btn bg-amber-500/10 px-4 py-2 text-sm text-amber-400 border border-amber-500/30"
										>
											Panggil Ulang
										</button>
										<button
											disabled={acting === q.id}
											onClick={() => action(q.id, () => api.adjustQueue(q.id, 'completed'))}
											className="btn bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 border border-emerald-500/30"
										>
											Selesai
										</button>
										<button
											disabled={acting === q.id}
											onClick={() => action(q.id, () => api.adjustQueue(q.id, 'skipped'))}
											className="btn bg-slate-500/10 px-4 py-2 text-sm text-slate-300 border border-slate-500/30"
										>
											Lewati
										</button>
									</>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}