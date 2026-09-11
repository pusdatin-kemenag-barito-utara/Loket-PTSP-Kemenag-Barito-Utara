import React from 'react';
import type { Queue } from '../../lib/types';
import { formatTicketNumber } from '../../lib/format';

interface KioskTicketCardProps {
	ticket: Queue;
	onReset: () => void;
}

export default function KioskTicketCard({ ticket, onReset }: KioskTicketCardProps) {
	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<div className="glass-strong w-full max-w-md rounded-3xl p-8 text-center animate-fade-up">
				<p className="text-sm font-bold uppercase tracking-widest text-slate-400">
					Nomor Antrian Anda
				</p>
				<p className="mt-2 text-6xl font-extrabold text-gradient-gold tabular-nums">
					{ticket.category_code}
					{formatTicketNumber(ticket.ticket_number)}
				</p>
				<p className="mt-3 text-slate-300 font-semibold">{ticket.category_name}</p>

				<div className="glass mt-6 rounded-2xl p-4 text-left text-sm text-slate-400 space-y-2">
					<p>• Simpan atau catat nomor antrian Anda.</p>
					<p>
						• Pantau giliran Anda di layar monitor atau melalui menu{' '}
						<strong className="text-slate-200">Cek Antrian</strong>.
					</p>
					<p>• Nomor akan dipanggil sesuai urutan. Mohon menunggu di ruang tunggu.</p>
				</div>

				<div className="mt-6 flex gap-3">
					<a href={`/track?id=${ticket.id}`} className="btn btn-ghost flex-1 text-sm">
						Cek Antrian
					</a>
					<button className="btn btn-green flex-1 text-sm" onClick={onReset}>
						Ambil Antrian Baru
					</button>
				</div>
			</div>
		</div>
	);
}
