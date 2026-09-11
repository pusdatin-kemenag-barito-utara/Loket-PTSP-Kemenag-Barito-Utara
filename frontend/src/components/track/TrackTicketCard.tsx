import React from 'react';
import type { Ticket } from '../../lib/types';
import { formatTicketNumber } from '../../lib/format';

interface TrackTicketCardProps {
	ticket: Ticket;
	onReset: () => void;
}

export default function TrackTicketCard({ ticket, onReset }: TrackTicketCardProps) {
	const getStatusConfig = (status: string) => {
		if (status === 'waiting') {
			return { text: 'Menunggu', color: 'text-kmenag-gold bg-kmenag-gold/10' };
		}
		if (status === 'called') {
			return { text: 'Silakan ke Loket', color: 'text-emerald-400 bg-emerald-500/10' };
		}
		if (status === 'completed') {
			return { text: 'Selesai', color: 'text-slate-300 bg-white/10' };
		}
		return { text: 'Dilewati', color: 'text-slate-400 bg-white/5' };
	};

	const status = getStatusConfig(ticket.status);

	return (
		<div className="glass-strong rounded-3xl p-8 text-center animate-fade-up">
			<p className="text-sm font-bold uppercase tracking-widest text-slate-400">Nomor Antrian Anda</p>
			<p className="mt-2 text-6xl font-extrabold text-gradient-gold tabular-nums">
				{ticket.category_code}
				{formatTicketNumber(ticket.ticket_number)}
			</p>
			<p className="mt-2 text-slate-300 font-semibold">{ticket.category_name}</p>

			<p className={`mt-5 inline-flex items-center rounded-full px-4 py-2 text-sm font-bold ${status.color}`}>
				{status.text}
			</p>

			<div className="mt-6 rounded-2xl bg-night-900/60 p-4 text-sm text-slate-400">
				{ticket.status === 'waiting' ? (
					<p>
						Ada <strong className="text-kmenag-gold">{ticket.queue_ahead}</strong> antrian di depan Anda.
					</p>
				) : ticket.status === 'called' ? (
					<p>
						Mohon menuju ke loket <strong className="text-white">{ticket.category_name}</strong> sekarang.
					</p>
				) : ticket.status === 'completed' ? (
					<p>Pelayanan Anda telah selesai. Terima kasih atas kunjungan Anda.</p>
				) : (
					<p>Nomor ini telah dilewati. Silakan hubungi petugas loket.</p>
				)}
			</div>

			<div className="mt-6 flex gap-3">
				<button type="button" onClick={onReset} className="btn btn-ghost flex-1 text-sm">
					Cek Antrian Lain
				</button>
			</div>
		</div>
	);
}
