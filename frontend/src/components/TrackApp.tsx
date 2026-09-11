import React from 'react';
import { api } from '../lib/api';
import type { Ticket } from '../lib/types';
import TrackSearchForm from './track/TrackSearchForm';
import TrackTicketCard from './track/TrackTicketCard';

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
		() =>
			initialId ??
			(typeof window !== 'undefined'
				? new URLSearchParams(window.location.search).get('id') ?? undefined
				: undefined),
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

	// Auto-refresh while ticket is waiting or called
	React.useEffect(() => {
		if (!ticket || (ticket.status !== 'waiting' && ticket.status !== 'called')) return;
		const timer = setInterval(() => {
			api
				.track(ticket.id)
				.then(setTicket)
				.catch(() => {});
		}, 5000);
		return () => clearInterval(timer);
	}, [ticket?.id, ticket?.status]);

	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault();
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

	return (
		<div className="flex min-h-screen flex-col items-center justify-center p-4">
			<div className="w-full max-w-md">
				<div className="mb-8 text-center">
					<p className="text-sm font-bold uppercase tracking-widest text-kmenag-gold">Cek Antrian</p>
					<h1 className="mt-2 text-3xl font-extrabold text-white">Pantau Giliran Anda</h1>
				</div>

				{!ticket ? (
					<TrackSearchForm
						code={code}
						number={number}
						loading={loading}
						error={error}
						onChangeCode={setCode}
						onChangeNumber={setNumber}
						onSearch={handleSearch}
					/>
				) : (
					<TrackTicketCard ticket={ticket} onReset={() => setTicket(null)} />
				)}
			</div>
		</div>
	);
}