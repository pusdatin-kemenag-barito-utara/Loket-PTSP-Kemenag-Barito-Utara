import React from 'react';
import { api } from '../../lib/api';
import type { Category, Queue } from '../../lib/types';
import { formatTicketNumber } from '../../lib/format';
import { PrinterIcon, TicketIcon } from '../common/Icons';

interface AdminPrintTicketProps {
	categories: Category[];
	onTicketCreated: (q: Queue) => void;
}

export default function AdminPrintTicket({ categories, onTicketCreated }: AdminPrintTicketProps) {
	const [creating, setCreating] = React.useState(false);
	const [lastCreated, setLastCreated] = React.useState<Queue | null>(null);
	const [error, setError] = React.useState<string | null>(null);

	const handleCreate = async (cat: Category) => {
		setCreating(true);
		setError(null);
		try {
			const q = await api.createTicket(cat.id);
			setLastCreated(q);
			onTicketCreated(q);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Gagal membuat tiket antrian.');
		} finally {
			setCreating(false);
		}
	};

	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
			<div className="mb-6 border-b border-slate-100 pb-4">
				<h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
					<PrinterIcon className="h-6 w-6 text-emerald-600" />
					Cetak / Buat Tiket Antrian Pengunjung
				</h3>
				<p className="text-sm font-medium text-slate-500 mt-1">
					Pilih kategori layanan untuk membuatkan nomor antrian langsung bagi pengunjung yang datang ke meja informasi loket.
				</p>
			</div>

			{error && (
				<div className="mb-6 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-bold text-rose-800 shadow-xs">
					{error}
				</div>
			)}

			{lastCreated && (
				<div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-xs">
					<div>
						<p className="text-xs font-black uppercase tracking-wider text-emerald-800">
							Tiket Berhasil Diterbitkan
						</p>
						<p className="mt-1 text-4xl font-black text-slate-900">
							{lastCreated.category_code} - {formatTicketNumber(lastCreated.ticket_number)}
						</p>
						<p className="text-sm font-bold text-emerald-950 mt-0.5">{lastCreated.category_name}</p>
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => window.print()}
							className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors"
						>
							<PrinterIcon className="h-4 w-4" />
							<span>Cetak Struk Tiket</span>
						</button>
					</div>
				</div>
			)}

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{categories.map((cat) => (
					<button
						key={cat.id}
						type="button"
						disabled={creating}
						onClick={() => handleCreate(cat)}
						className="group flex flex-col items-start justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-left hover:border-emerald-500 hover:bg-emerald-50/40 transition-all shadow-xs disabled:opacity-50"
					>
						<div className="flex w-full items-center justify-between">
							<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-black text-lg border border-emerald-200 group-hover:scale-105 transition-transform">
								{cat.code}
							</span>
							<span className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-500 group-hover:text-emerald-700">
								+ Buat Tiket
							</span>
						</div>

						<div className="mt-4">
							<h4 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-800 transition-colors">
								{cat.name}
							</h4>
							<p className="mt-1 text-xs text-slate-500 line-clamp-2">
								{cat.description || 'Pelayanan terpadu kantor kementerian agama.'}
							</p>
						</div>
					</button>
				))}
			</div>
		</div>
	);
}
