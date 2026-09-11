import React from 'react';
import { api } from '../lib/api';
import { connectRealtime } from '../lib/realtime';
import type { Category, Queue, WSMessage } from '../lib/types';
import KioskTicketCard from './kiosk/KioskTicketCard';
import KioskCategoryGrid from './kiosk/KioskCategoryGrid';

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
				if (!cancelled) setError('Gagal memuat layanan antrian. Mohon coba lagi.');
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	// Realtime Category Sync for Self-Service Kiosk
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
		return <KioskTicketCard ticket={ticket} onReset={() => setTicket(null)} />;
	}

	return (
		<div className="flex min-h-screen flex-col items-center justify-center p-4">
			<div className="mb-8 text-center">
				<p className="text-sm font-bold uppercase tracking-widest text-kmenag-gold">Pilih Layanan</p>
				<h1 className="mt-2 text-3xl font-extrabold text-white">Layanan Apa yang Anda Butuhkan?</h1>
			</div>

			{error && (
				<p className="mb-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-400">{error}</p>
			)}

			{loading ? (
				<p className="text-slate-500">Memuat daftar layanan PTSP...</p>
			) : (
				<KioskCategoryGrid
					categories={categories}
					creating={creating}
					onSelectCategory={handleTakeTicket}
				/>
			)}
		</div>
	);
}