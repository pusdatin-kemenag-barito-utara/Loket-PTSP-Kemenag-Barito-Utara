import React from 'react';
import { api } from '../lib/api';
import type { Category, Queue } from '../lib/types';

function formatNumber(n: number) {
	return String(n).padStart(3, '0');
}

export default function KioskApp() {
	const [categories, setCategories] = React.useState<Category[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);
	const [creating, setCreating] = React.useState(false);
	const [ticket, setTicket] = React.useState<Queue | null>(null);

	React.useEffect(() => {
		let cancelled = false;
		api
			.categories()
			.then((cats) => {
				if (!cancelled) setCategories(cats);
			})
			.catch(() => {
				if (!cancelled) setError('Gagal memuat layanan. Mohon coba lagi.');
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const takeTicket = async (category: Category) => {
		setCreating(true);
		setError(null);
		try {
			const q = await api.createTicket(category.id);
			setTicket(q);
		} catch {
			setError('Gagal mengambil nomor antrian. Mohon coba lagi.');
		} finally {
			setCreating(false);
		}
	};

	if (ticket) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<div className="glass-strong w-full max-w-md rounded-3xl p-8 text-center animate-fade-up">
					<p className="text-sm font-bold uppercase tracking-widest text-slate-400">Nomor Antrian Anda</p>
					<p className="mt-2 text-6xl font-extrabold text-gradient-gold tabular-nums">
						{ticket.category_code}
						{formatNumber(ticket.ticket_number)}
					</p>
					<p className="mt-3 text-slate-300">{ticket.category_name}</p>

					<div className="glass mt-6 rounded-2xl p-4 text-left text-sm text-slate-400">
						<p>
							• Simpan atau catat nomor antrian Anda.
						</p>
						<p>
							• Pantau giliran Anda di layar monitor atau melalui menu{' '}
							<strong className="text-slate-200">Cek Antrian</strong>.
						</p>
						<p>
							• Nomor akan dipanggil sesuai urutan. Mohon menunggu di ruang tunggu.
						</p>
					</div>

					<div className="mt-6 flex gap-3">
						<a href={`/track?id=${ticket.id}`} className="btn btn-ghost flex-1 text-sm">Cek Antrian</a>
						<button className="btn btn-green flex-1 text-sm" onClick={() => setTicket(null)}>
							Ambil Antrian Baru
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen flex-col items-center justify-center p-4">
			<div className="mb-8 text-center">
				<p className="text-sm font-bold uppercase tracking-widest text-kmenag-gold">Pilih Layanan</p>
				<h1 className="mt-2 text-3xl font-extrabold text-white">Layanan Apa yang Anda Butuhkan?</h1>
			</div>

			{error && <p className="mb-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-400">{error}</p>}

			{loading ? (
				<p className="text-slate-500">Memuat layanan...</p>
			) : (
				<div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
					{categories.map((cat) => (
						<button
							key={cat.id}
							onClick={() => takeTicket(cat)}
							disabled={creating}
							className="glass group rounded-2xl p-6 text-left transition hover:border-kmenag-gold/60 hover:bg-kmenag-gold/5"
						>
							<div className="flex items-center gap-4">
								<span className="glass-gold flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-extrabold text-kmenag-gold">
									{cat.code}
								</span>
								<div>
									<p className="font-bold text-white">{cat.name}</p>
									<p className="mt-0.5 text-sm text-slate-400">{cat.description}</p>
								</div>
							</div>
							<p className="mt-4 text-sm font-semibold text-slate-500 transition group-hover:text-kmenag-gold">Ambil Antrian →</p>
						</button>
					))}
				</div>
			)}
		</div>
	);
}