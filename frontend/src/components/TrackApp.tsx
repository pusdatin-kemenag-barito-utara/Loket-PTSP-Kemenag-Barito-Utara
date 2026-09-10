import React from 'react';
import { api } from '../lib/api';
import type { Ticket } from '../lib/types';

function formatNumber(n: number) {
	return String(n).padStart(3, '0');
}

interface TrackAppProps {
	initialId?: string;
}

export default function TrackApp({ initialId }: TrackAppProps) {
	const [code, setCode] = React.useState('');
	const [number, setNumber] = React.useState('');
	const [ticket, setTicket] = React.useState<Ticket | null>(null);
	const [error, setError] = React.useState<string | null>(null);
	const [loading, setLoading] = React.useState(false);

	// Support ?id=URL param (e.g. /track?id=uuid) for deep links from the kiosk.
	const queryId = React.useMemo(
		() => initialId ?? (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') ?? undefined : undefined),
		[initialId],
	);

	React.useEffect(() => {
		if (queryId) {
			api
				.track(queryId)
				.then(setTicket)
				.catch(() => setError('Tiket tidak ditemukan.'));
		}
	}, [queryId]);

	// Auto-refresh while the ticket is still active (waiting/called).
	React.useEffect(() => {
		if (!ticket || (ticket.status !== 'waiting' && ticket.status !== 'called')) return;
		const t = setInterval(() => {
			api
				.track(ticket.id)
				.then(setTicket)
				.catch(() => {});
		}, 5000);
		return () => clearInterval(t);
	}, [ticket?.id, ticket?.status]);

	const search = async (e?: React.FormEvent) => {
		e?.preventDefault();
		const codeVal = code.trim().toUpperCase();
		const numVal = number.trim();
		if (!codeVal || !numVal) {
			setError('Masukkan kode layanan dan nomor antrian.');
			return;
		}
		setLoading(true);
		setError(null);
		setTicket(null);
		try {
			setTicket(await api.lookup(codeVal, parseInt(numVal, 10)));
		} catch {
			setError('Tiket tidak ditemukan. Periksa kembali kode dan nomor Anda.');
		} finally {
			setLoading(false);
		}
	};

	const statusLabel = (t: Ticket) => {
		if (t.status === 'waiting') return { text: 'Menunggu', color: 'text-kmenag-gold bg-kmenag-gold/10' };
		if (t.status === 'called') return { text: 'Silakan ke loket', color: 'text-kmenag-green-light bg-kmenag-green-light/10' };
		if (t.status === 'completed') return { text: 'Selesai', color: 'text-emerald-400 bg-emerald-500/10' };
		return { text: 'Dilewati', color: 'text-slate-400 bg-white/5' };
	};

	return (
		<div className="flex min-h-screen flex-col items-center justify-center p-4">
			<div className="w-full max-w-md">
				<div className="mb-8 text-center">
					<p className="text-sm font-bold uppercase tracking-widest text-kmenag-gold">Cek Antrian</p>
					<h1 className="mt-2 text-3xl font-extrabold text-white">Pantau Giliran Anda</h1>
				</div>

				{!ticket && (
					<form onSubmit={search} className="glass-strong rounded-3xl p-6">
						<div className="flex gap-3">
							<input
								type="text"
								value={code}
								onChange={(e) => setCode(e.target.value)}
								placeholder="Kode (A-D)"
								maxLength={1}
								className="w-24 rounded-xl border border-white/10 bg-night-900/60 px-3 py-3 text-center text-lg font-bold text-white uppercase outline-none focus:border-kmenag-gold/60"
							/>
							<input
								type="text"
								inputMode="numeric"
								value={number}
								onChange={(e) => setNumber(e.target.value)}
								placeholder="Nomor antrian"
								className="flex-1 rounded-xl border border-white/10 bg-night-900/60 px-3 py-3 text-lg font-bold text-white outline-none focus:border-kmenag-gold/60"
							/>
						</div>
						{error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
						<button type="submit" disabled={loading} className="btn btn-gold mt-4 w-full text-sm">
							{loading ? 'Mencari...' : 'Cek Nomor Antrian'}
						</button>
					</form>
				)}

				{ticket && (
					<div className="glass-strong rounded-3xl p-8 text-center animate-fade-up">
						<p className="text-sm font-bold uppercase tracking-widest text-slate-400">Nomor Antrian Anda</p>
						<p className="mt-2 text-6xl font-extrabold text-gradient-gold tabular-nums">
							{ticket.category_code}
							{formatNumber(ticket.ticket_number)}
						</p>
						<p className="mt-2 text-slate-300">{ticket.category_name}</p>

						<p className={`mt-5 inline-flex items-center rounded-full px-4 py-2 text-sm font-bold ${statusLabel(ticket).color}`}>
							{statusLabel(ticket).text}
						</p>

						<div className="mt-6 rounded-2xl bg-night-900/60 p-4 text-sm text-slate-400">
							{ticket.status === 'waiting' ? (
								<p>
									Ada <strong className="text-kmenag-gold">{ticket.queue_ahead}</strong> antrian di depan Anda.
								</p>
							) : ticket.status === 'called' ? (
								<p>
									Mohon menuju ke loket <strong className="text-slate-200">{ticket.category_name}</strong> sekarang.
								</p>
							) : ticket.status === 'completed' ? (
								<p>Layanan Anda telah selesai. Terima kasih.</p>
							) : (
								<p>Nomor ini telah dilewati. Silakan hubungi petugas.</p>
							)}
						</div>

						<div className="mt-6 flex gap-3">
							<button onClick={() => setTicket(null)} className="btn btn-ghost flex-1 text-sm">
								Cek Antrian Lain
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}