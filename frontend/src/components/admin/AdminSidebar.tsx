import React from 'react';
import type { User } from '../../lib/types';
import Logo from '../Logo';
import {
	QueueIcon,
	TicketIcon,
	UsersIcon,
	TvIcon,
	ChartBarIcon,
	ArrowRightOnRectangleIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	ShieldCheckIcon,
	UserIcon,
	Squares2X2Icon,
} from '../common/Icons';

export type AdminTab = 'queues' | 'categories' | 'print' | 'users' | 'tv' | 'analytics';

interface AdminSidebarProps {
	user: User | null;
	activeTab: AdminTab;
	onSelectTab: (tab: AdminTab) => void;
	waitingCount: number;
	collapsed: boolean;
	onToggleCollapse: () => void;
	onLogout: () => void;
}

export default function AdminSidebar({
	user,
	activeTab,
	onSelectTab,
	waitingCount,
	collapsed,
	onToggleCollapse,
	onLogout,
}: AdminSidebarProps) {
	const navGroups: {
		title: string;
		items: {
			id: AdminTab;
			label: string;
			icon: React.ComponentType<{ className?: string }>;
			badge?: number;
		}[];
	}[] = [
		{
			title: 'Menu Layanan & Loket',
			items: [
				{ id: 'queues', label: 'Panggilan Antrian', icon: QueueIcon, badge: waitingCount },
				{ id: 'print', label: 'Cetak Tiket Mandiri', icon: TicketIcon },
			],
		},
		{
			title: 'Menu Kelola & Pengaturan',
			items: [
				{ id: 'categories', label: 'Manajemen Seksi Layanan', icon: Squares2X2Icon },
				{ id: 'tv', label: 'Pengaturan Layar TV', icon: TvIcon },
				{ id: 'users', label: 'Manajemen Pengguna', icon: UsersIcon },
			],
		},
		{
			title: 'Menu Analisis & Laporan',
			items: [
				{ id: 'analytics', label: 'Statistik & Rekap', icon: ChartBarIcon },
			],
		},
	];

	return (
		<aside
			className={`relative flex flex-col h-full border-r border-slate-200/90 bg-white shadow-sm transition-all duration-300 z-30 select-none ${
				collapsed ? 'w-20' : 'w-72'
			}`}
		>
			{/* Top Brand */}
			<div className="flex h-20 items-center justify-between border-b border-slate-100 px-4 bg-white">
				<div className="flex items-center gap-3 overflow-hidden">
					<Logo showText={false} compact />
					{!collapsed && (
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-1.5">
								<span className="truncate text-sm font-extrabold tracking-tight text-slate-900">LOKET PTSP</span>
								<span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
									ADMIN
								</span>
							</div>
							<p className="truncate text-xs font-medium text-slate-500">Kemenag Barito Utara</p>
						</div>
					)}
				</div>

				<button
					type="button"
					onClick={onToggleCollapse}
					title={collapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
					className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
				>
					{collapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
				</button>
			</div>

			{/* Categorized Navigation */}
			<div className="flex-1 overflow-y-auto px-3 py-5 space-y-5 custom-scrollbar">
				{navGroups.map((group, groupIdx) => (
					<div key={group.title} className="space-y-1">
						{!collapsed && (
							<div className="px-3 pb-1.5 flex items-center gap-2">
								<p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
									{group.title}
								</p>
							</div>
						)}
						{collapsed && groupIdx > 0 && (
							<div className="my-2 border-t border-slate-100" />
						)}

						{group.items.map((item) => {
							const Icon = item.icon;
							const isActive = activeTab === item.id;
							return (
								<button
									key={item.id}
									type="button"
									onClick={() => onSelectTab(item.id)}
									title={collapsed ? item.label : undefined}
									className={`group relative flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm transition-all ${
										isActive
											? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-xs'
											: 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent font-semibold'
									}`}
								>
									<Icon
										className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-110 ${
											isActive ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-600'
										}`}
									/>
									{!collapsed && (
										<span className="flex-1 text-left truncate tracking-tight text-xs sm:text-sm">
											{item.label}
										</span>
									)}
									{!collapsed && typeof item.badge === 'number' && item.badge > 0 && (
										<span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-bold text-amber-800 border border-amber-200">
											{item.badge}
										</span>
									)}
									{collapsed && typeof item.badge === 'number' && item.badge > 0 && (
										<span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-amber-500 ring-4 ring-white" />
									)}
								</button>
							);
						})}
					</div>
				))}

				{/* Separate Screen Links */}
				<div className="border-t border-slate-100 pt-4 space-y-1">
					{!collapsed && (
						<p className="px-3 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
							Tampilan Terpisah
						</p>
					)}
					<div className="space-y-1">
						<a
							href="/display"
							target="_blank"
							rel="noreferrer"
							title={collapsed ? 'Buka Layar TV' : undefined}
							className="group flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
						>
							<TvIcon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-amber-600" />
							{!collapsed && <span className="truncate">Layar TV Antrian ↗</span>}
						</a>
						<a
							href="/kiosk"
							target="_blank"
							rel="noreferrer"
							title={collapsed ? 'Buka Kiosk Mandiri' : undefined}
							className="group flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
						>
							<TicketIcon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600" />
							{!collapsed && <span className="truncate">Kiosk Mandiri ↗</span>}
						</a>
					</div>
				</div>
			</div>

			{/* User Profile & Logout Button - Always at the Bottom-Most Left */}
			<div className="mt-auto border-t border-slate-200/90 bg-slate-50/80 p-3.5">
				<div
					className={`flex items-center gap-3 rounded-xl ${
						collapsed ? 'justify-center' : 'bg-white border border-slate-200/90 p-2.5 shadow-xs'
					}`}
				>
					<div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold shadow-xs">
						<UserIcon className="h-5 w-5 text-white" />
						<span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
					</div>

					{!collapsed && (
						<div className="min-w-0 flex-1">
							<p className="truncate text-xs font-extrabold text-slate-900">
								{user?.name || 'Petugas PTSP'}
							</p>
							<div className="flex items-center gap-1.5 mt-0.5">
								<span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
									<ShieldCheckIcon className="h-3 w-3" />
									{user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
								</span>
								<span className="truncate text-[10px] font-medium text-slate-500">
									@{user?.username?.split('@')[0]}
								</span>
							</div>
						</div>
					)}

					{!collapsed && (
						<button
							type="button"
							onClick={onLogout}
							title="Keluar / Logout"
							className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
						>
							<ArrowRightOnRectangleIcon className="h-4 w-4" />
						</button>
					)}
				</div>

				{collapsed && (
					<div className="mt-2 flex justify-center">
						<button
							type="button"
							onClick={onLogout}
							title="Keluar / Logout"
							className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors shadow-xs"
						>
							<ArrowRightOnRectangleIcon className="h-4 w-4" />
						</button>
					</div>
				)}
			</div>
		</aside>
	);
}
