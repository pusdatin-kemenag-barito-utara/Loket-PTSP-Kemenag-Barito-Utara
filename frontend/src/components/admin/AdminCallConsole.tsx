import React from 'react';
import type { Category, Queue } from '../../lib/types';
import {
	BellIcon,
	CheckCircleIcon,
	XMarkIcon,
	QueueIcon,
	ClockIcon,
	ArrowPathIcon,
	Squares2X2Icon,
	SearchIcon,
} from '../common/Icons';

interface AdminCallConsoleProps {
	queues: Queue[];
	categories: Category[];
	acting: string | null;
	activeCounter: string;
	onCall: (queueId: string) => void;
	onRecall: (queueId: string) => void;
	onComplete: (queueId: string) => void;
	onSkip: (queueId: string) => void;
}

export default function AdminCallConsole({
	queues,
	categories,
	acting,
	activeCounter,
	onCall,
	onRecall,
	onComplete,
	onSkip,
}: AdminCallConsoleProps) {
	const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
	const [searchQuery, setSearchQuery] = React.useState<string>('');

	// Separate currently called and waiting queues
	const safeQueues = Array.isArray(queues) ? queues : [];
	const currentlyCalled = safeQueues.find((q) => q && q.status === 'called');
	const waitingQueues = safeQueues.filter((q) => q && q.status === 'waiting');

	// Filter waiting by category and search
	const filteredWaiting = waitingQueues.filter((q) => {
		const matchCat =
			selectedCategory === 'all' ||
			q.category_id === selectedCategory ||
			q.category_code === selectedCategory;

		if (!matchCat) return false;

		if (!searchQuery.trim()) return true;
		const query = searchQuery.toLowerCase().trim();
		const ticketStr = `${q.category_code}${String(q.ticket_number).padStart(3, '0')}`.toLowerCase();
		return ticketStr.includes(query) || q.category_name.toLowerCase().includes(query);
	});

	const getCategoryCount = (catId: string) => {
		return waitingQueues.filter((q) => q.category_id === catId || q.category_code === catId).length;
	};

	return (
		<div className="space-y-6">
			{/* Currently Active / Called Ticket Spotlight Card */}
			<div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 p-6 shadow-sm">
				<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
					<div>
						<div className="flex items-center gap-2">
							<span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
							<span className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
								Sedang Dilayani di {activeCounter}
							</span>
						</div>

						{currentlyCalled ? (
							<div className="mt-3 flex items-baseline gap-4">
								<span className="text-5xl lg:text-6xl font-black tracking-tight text-slate-900 tabular-nums">
									{currentlyCalled.category_code}
									{String(currentlyCalled.ticket_number).padStart(3, '0')}
								</span>
								<div>
									<h2 className="text-lg font-extrabold text-slate-900">
										{currentlyCalled.category_name}
									</h2>
									<p className="text-xs text-slate-500 font-medium">
										Dipanggil pada{' '}
										{currentlyCalled.called_at
											? new Date(currentlyCalled.called_at).toLocaleTimeString('id-ID', {
													hour: '2-digit',
													minute: '2-digit',
												})
											: '—'}
									</p>
								</div>
							</div>
						) : (
							<div className="mt-2">
								<h2 className="text-2xl font-bold text-slate-800">Belum Ada Panggilan Aktif</h2>
								<p className="text-xs text-slate-500 mt-1">
									Pilih antrian di bawah untuk memanggil nomor antrian berikutnya ke {activeCounter}.
								</p>
							</div>
						)}
					</div>

					{/* Action Buttons for Active Ticket */}
					{currentlyCalled && (
						<div className="flex flex-wrap items-center gap-3">
							<button
								type="button"
								disabled={acting === currentlyCalled.id}
								onClick={() => onRecall(currentlyCalled.id)}
								className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-100/80 px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-200 transition-colors shadow-xs disabled:opacity-50"
							>
								<ArrowPathIcon className="h-4 w-4" />
								<span>Panggil Ulang</span>
							</button>

							<button
								type="button"
								disabled={acting === currentlyCalled.id}
								onClick={() => onComplete(currentlyCalled.id)}
								className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
							>
								<CheckCircleIcon className="h-4 w-4 stroke-[2.5]" />
								<span>Selesaikan Pelayanan</span>
							</button>

							<button
								type="button"
								disabled={acting === currentlyCalled.id}
								onClick={() => onSkip(currentlyCalled.id)}
								className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors shadow-xs disabled:opacity-50"
							>
								<XMarkIcon className="h-4 w-4" />
								<span>Lewati</span>
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Seksi Selection & Category Management Area (NO SIDE-SCROLLING, CLEAN WRAP GRID) */}
			<div className="space-y-3">
				{/* Top Sub-Header */}
				<div>
					<h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
						<Squares2X2Icon className="h-4 w-4 text-emerald-600" />
						Filter Seksi Layanan ({categories.length} Seksi Aktif)
					</h3>
					<p className="text-xs text-slate-400">
						Pilih seksi di bawah untuk memfilter daftar antrian yang menunggu
					</p>
				</div>

				{/* Responsive Wrapped Cards Grid (NEVER HORIZONTALLY SCROLLS) */}
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
					{/* Card "Semua Seksi" */}
					<button
						type="button"
						onClick={() => setSelectedCategory('all')}
						className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-all ${
							selectedCategory === 'all'
								? 'border-emerald-600 bg-emerald-50/90 ring-2 ring-emerald-600/20 shadow-xs'
								: 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
						}`}
					>
						<div className="flex items-center justify-between gap-2">
							<span
								className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${
									selectedCategory === 'all'
										? 'bg-emerald-600 text-white'
										: 'bg-slate-100 text-slate-700'
								}`}
							>
								★
							</span>
							<span
								className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
									selectedCategory === 'all'
										? 'bg-emerald-600 text-white'
										: 'bg-slate-100 text-slate-700'
								}`}
							>
								{waitingQueues.length}
							</span>
						</div>
						<div className="mt-2.5">
							<p
								className={`text-xs font-extrabold truncate ${
									selectedCategory === 'all' ? 'text-emerald-900' : 'text-slate-800'
								}`}
							>
								Semua Seksi
							</p>
							<p className="text-[10px] text-slate-400 truncate">Seluruh antrian</p>
						</div>
					</button>

					{/* Individual Category Cards */}
					{categories.map((cat) => {
						const count = getCategoryCount(cat.id);
						const isSelected = selectedCategory === cat.id;

						return (
							<button
								key={cat.id}
								type="button"
								onClick={() => setSelectedCategory(cat.id)}
								className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-all ${
									isSelected
										? 'border-emerald-600 bg-emerald-50/90 ring-2 ring-emerald-600/20 shadow-xs'
										: 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
								}`}
							>
								<div className="flex items-center justify-between gap-2">
									<span
										className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${
											isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800'
										}`}
									>
										{cat.code}
									</span>
									<span
										className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
											isSelected
												? 'bg-emerald-600 text-white'
												: count > 0
												? 'bg-amber-100 text-amber-900 border border-amber-200'
												: 'bg-slate-100 text-slate-500'
										}`}
									>
										{count}
									</span>
								</div>
								<div className="mt-2.5">
									<p
										className={`text-xs font-extrabold truncate ${
											isSelected ? 'text-emerald-900' : 'text-slate-800'
										}`}
										title={cat.name}
									>
										{cat.name}
									</p>
									<p className="text-[10px] text-slate-400 truncate">Loket {cat.code}</p>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Waiting Queues Section */}
			<div className="space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
						<QueueIcon className="h-4 w-4 text-emerald-600" />
						Daftar Antrian Menunggu ({filteredWaiting.length})
					</h3>

					{/* Quick Search Box */}
					<div className="relative w-full sm:w-64">
						<SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Cari nomor antrian / seksi..."
							className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery('')}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
							>
								×
							</button>
						)}
					</div>
				</div>

				{filteredWaiting.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
						<QueueIcon className="mx-auto h-12 w-12 text-slate-300" />
						<p className="mt-3 text-sm font-bold text-slate-700">
							Tidak ada antrian menunggu pada kategori ini.
						</p>
						<p className="text-xs text-slate-500 mt-1">
							Pengunjung baru yang mengambil tiket di Kiosk akan muncul otomatis di sini.
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
						{filteredWaiting.map((item, idx) => {
							const isNext = idx === 0;
							const createdTime = new Date(item.created_at).toLocaleTimeString('id-ID', {
								hour: '2-digit',
								minute: '2-digit',
							});

							return (
								<div
									key={item.id}
									className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all bg-white ${
										isNext
											? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
											: 'border-slate-200 hover:border-slate-300 shadow-xs'
									}`}
								>
									{isNext && (
										<span className="absolute -top-2.5 right-4 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
											Antrian Berikutnya
										</span>
									)}

									<div>
										<div className="flex items-center justify-between">
											<span className="text-3xl font-black tracking-tight text-slate-900 tabular-nums">
												{item.category_code}
												{String(item.ticket_number).padStart(3, '0')}
											</span>
											<span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 flex items-center gap-1">
												<ClockIcon className="h-3 w-3" />
												{createdTime}
											</span>
										</div>

										<h4 className="mt-2 text-sm font-bold text-slate-800 line-clamp-1">
											{item.category_name}
										</h4>
										<p className="text-xs font-medium text-slate-400 capitalize">
											Sumber Tiket: {item.source}
										</p>
									</div>

									<div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
										<span className="text-[11px] text-slate-500">
											Panggil ke <strong className="text-slate-800">{activeCounter}</strong>
										</span>
										<button
											type="button"
											disabled={acting === item.id}
											onClick={() => onCall(item.id)}
											className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-colors shadow-xs disabled:opacity-50"
										>
											<BellIcon className="h-4 w-4" />
											<span>{acting === item.id ? 'Memanggil...' : 'Panggil'}</span>
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
