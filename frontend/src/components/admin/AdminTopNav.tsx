import React from 'react';
import type { AdminTab } from './AdminSidebar';
import { Bars3Icon } from '../common/Icons';
import ModernSelect from '../common/ModernSelect';

interface AdminTopNavProps {
	activeTab: AdminTab;
	activeCounter: string;
	onChangeCounter: (counter: string) => void;
	wsConnected: boolean;
	onToggleMobileSidebar?: () => void;
}

const TAB_TITLES: Record<AdminTab, { title: string; subtitle: string }> = {
	queues: {
		title: 'Panggilan Antrian',
		subtitle: 'Konsol pemanggilan dan pengelolaan antrian loket aktif',
	},
	categories: {
		title: 'Manajemen Seksi Layanan',
		subtitle: 'Kelola kategori seksi layanan, kode loket (A, B, C), dan reset nomor antrian harian',
	},
	print: {
		title: 'Cetak Tiket Mandiri',
		subtitle: 'Pencetakan tiket instan untuk pengunjung walk-in di meja informasi',
	},
	users: {
		title: 'Manajemen Pengguna',
		subtitle: 'Kelola akun administrator, staf loket, dan hak akses sistem PTSP',
	},
	tv: {
		title: 'Pengaturan Layar TV',
		subtitle: 'Konfigurasi tayangan video, teks berjalan, dan sinkronisasi layar monitor',
	},
	analytics: {
		title: 'Statistik & Rekap Antrian',
		subtitle: 'Ringkasan performa dan rekapitulasi pelayanan hari ini',
	},
};

const COUNTERS = ['Loket 1', 'Loket 2', 'Loket 3', 'Loket 4', 'Loket 5'];

export default function AdminTopNav({
	activeTab,
	activeCounter,
	onChangeCounter,
	wsConnected,
	onToggleMobileSidebar,
}: AdminTopNavProps) {
	const [timeStr, setTimeStr] = React.useState('');

	React.useEffect(() => {
		const updateTime = () => {
			const now = new Date();
			const time = now.toLocaleTimeString('id-ID', {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hour12: false,
			});
			const date = now.toLocaleDateString('id-ID', {
				weekday: 'short',
				day: 'numeric',
				month: 'short',
				year: 'numeric',
			});
			setTimeStr(`${date} • ${time} WIB`);
		};
		updateTime();
		const interval = setInterval(updateTime, 1000);
		return () => clearInterval(interval);
	}, []);

	const meta = TAB_TITLES[activeTab] || { title: 'Admin PTSP', subtitle: '' };

	return (
		<header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 lg:px-8 backdrop-blur-md shadow-xs">
			{/* Left: Mobile Toggle & Page Title */}
			<div className="flex items-center gap-4">
				<button
					type="button"
					onClick={onToggleMobileSidebar}
					className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
				>
					<Bars3Icon className="h-5 w-5" />
				</button>

				<div>
					<h1 className="text-lg lg:text-xl font-extrabold tracking-tight text-slate-900">
						{meta.title}
					</h1>
					<p className="hidden sm:block text-xs font-medium text-slate-500">
						{meta.subtitle}
					</p>
				</div>
			</div>

			{/* Right: Counter Selector, Live Clock, WS Status */}
			<div className="flex items-center gap-3 sm:gap-4">
				{/* Active Counter / Loket Selector */}
				<div className="flex items-center gap-2">
					<span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 hidden sm:inline">
						Petugas:
					</span>
					<ModernSelect
						value={activeCounter}
						onChange={onChangeCounter}
						options={COUNTERS.map((c) => ({
							value: c,
							label: c,
						}))}
						size="sm"
						className="min-w-[110px]"
						buttonClassName="rounded-xl border-slate-200 bg-slate-50 font-bold text-emerald-800 hover:bg-white text-xs py-1.5 px-3 shadow-xs"
					/>
				</div>

				{/* Realtime WebSocket Indicator */}
				<div
					className={`flex items-center gap-2 rounded-full px-3 py-1 border text-xs font-bold shadow-xs transition-colors ${
						wsConnected
							? 'border-emerald-200 bg-emerald-50 text-emerald-800'
							: 'border-amber-200 bg-amber-50 text-amber-800'
					}`}
					title={wsConnected ? 'Sinkronisasi Realtime Aktif' : 'Menghubungkan ke Realtime Server...'}
				>
					<span
						className={`h-2 w-2 rounded-full ${
							wsConnected ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'
						}`}
					/>
					<span className="hidden md:inline">
						{wsConnected ? 'Realtime Aktif' : 'Menghubungkan'}
					</span>
				</div>

				{/* Live Clock WIB */}
				<div className="hidden xl:flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs">
					{timeStr}
				</div>
			</div>
		</header>
	);
}
