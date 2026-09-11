import React from 'react';
import { api } from '../lib/api';
import { connectRealtime } from '../lib/realtime';
import type { Category, Queue, User, WSMessage } from '../lib/types';
import AdminSidebar, { type AdminTab } from './admin/AdminSidebar';
import AdminTopNav from './admin/AdminTopNav';
import AdminCallConsole from './admin/AdminCallConsole';
import AdminCategoryManagement from './admin/AdminCategoryManagement';
import AdminPrintTicket from './admin/AdminPrintTicket';
import AdminUserManagement from './admin/AdminUserManagement';
import AdminTVSettings from './admin/AdminTVSettings';
import AdminAnalytics from './admin/AdminAnalytics';

export default function AdminApp() {
	const [user, setUser] = React.useState<User | null>(null);
	const [queues, setQueues] = React.useState<Queue[]>([]);
	const [categories, setCategories] = React.useState<Category[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [acting, setActing] = React.useState<string | null>(null);
	const [error, setError] = React.useState<string | null>(null);
	const [activeTab, setActiveTab] = React.useState<AdminTab>('queues');
	const [collapsed, setCollapsed] = React.useState(false);
	const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
	const [wsConnected, setWsConnected] = React.useState(false);

	// Counter selection (e.g. "Loket 1", "Loket 2") persisted in localStorage
	const [activeCounter, setActiveCounter] = React.useState<string>(() => {
		try {
			return localStorage.getItem('loket_active_counter') || 'Loket 1';
		} catch {
			return 'Loket 1';
		}
	});

	const handleChangeCounter = (counter: string) => {
		setActiveCounter(counter);
		try {
			localStorage.setItem('loket_active_counter', counter);
		} catch {
			/* ignore */
		}
	};

	React.useEffect(() => {
		let cancelled = false;
		const load = async () => {
			try {
				const [me, waiting, cats] = await Promise.all([api.me(), api.waiting(), api.categories()]);
				if (cancelled) return;
				setUser(me);
				setQueues(Array.isArray(waiting) ? waiting : []);
				setCategories(Array.isArray(cats) ? cats : []);
			} catch (err) {
				if (err instanceof Error && 'status' in err && (err as { status: number }).status === 401) {
					window.location.href = '/pusdatin/auth';
					return;
				}
				setError('Gagal memuat data awal admin.');
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, []);

	// Realtime WebSocket Connection & Listener
	React.useEffect(() => {
		let active = true;
		const conn = connectRealtime(
			(msg: WSMessage) => {
				if (!active) return;
				const q = msg.data as Queue;
				if (msg.type === 'queue_created') {
					setQueues((qs) => {
						if (qs.some((x) => x.id === q.id)) return qs;
						return [...qs, q].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
					});
				} else if (msg.type === 'queue_called' || msg.type === 'queue_recalled') {
					setQueues((qs) => [q, ...qs.filter((x) => x.id !== q.id)]);
				} else if (msg.type === 'queue_completed' || msg.type === 'queue_skipped') {
					setQueues((qs) => qs.filter((x) => x.id !== q.id));
				} else if (msg.type === 'categories_updated') {
					const cats = msg.data as Category[];
					if (Array.isArray(cats)) {
						setCategories(cats);
					}
				}
			},
			(connected: boolean) => {
				if (active) setWsConnected(connected);
			},
		);

		return () => {
			active = false;
			conn.close();
		};
	}, []);

	const executeAction = async (queueId: string, fn: () => Promise<Queue>) => {
		setActing(queueId);
		setError(null);
		try {
			const updated = await fn();
			if (updated.status === 'waiting' || updated.status === 'called') {
				setQueues((qs) => [updated, ...qs.filter((x) => x.id !== updated.id)]);
			} else {
				setQueues((qs) => qs.filter((x) => x.id !== queueId));
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Aksi gagal diproses.');
		} finally {
			setActing(null);
		}
	};

	const handleCall = (queueId: string) => executeAction(queueId, () => api.callQueue(queueId));
	const handleRecall = (queueId: string) => executeAction(queueId, () => api.recallQueue(queueId));
	const handleComplete = (queueId: string) => executeAction(queueId, () => api.adjustQueue(queueId, 'completed'));
	const handleSkip = (queueId: string) => executeAction(queueId, () => api.adjustQueue(queueId, 'skipped'));

	const handleLogout = async () => {
		try {
			await api.logout();
		} finally {
			window.location.href = '/pusdatin/auth';
		}
	};

	const refreshCategories = async () => {
		try {
			const [cats, waitingList] = await Promise.all([api.categories(), api.waiting()]);
			setCategories(Array.isArray(cats) ? cats : []);
			setQueues(Array.isArray(waitingList) ? waitingList : []);
		} catch {
			/* ignore */
		}
	};

	const safeQueues = Array.isArray(queues) ? queues : [];
	const waitingCount = safeQueues.filter((q) => q && q.status === 'waiting').length;

	if (loading) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-slate-50 text-slate-600">
				<div className="flex flex-col items-center gap-3">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
					<p className="text-sm font-bold text-slate-700">Memuat Portal Petugas Loket PTSP...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased selection:bg-emerald-600 selection:text-white">
			{/* Mobile Sidebar Backdrop */}
			{mobileSidebarOpen && (
				<div
					className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
					onClick={() => setMobileSidebarOpen(false)}
				/>
			)}

			{/* Left Sidebar (Desktop & Mobile Drawer) */}
			<div
				className={`fixed inset-y-0 left-0 z-50 lg:static transition-transform duration-300 lg:translate-x-0 ${
					mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
				}`}
			>
				<AdminSidebar
					user={user}
					activeTab={activeTab}
					onSelectTab={(tab) => {
						setActiveTab(tab);
						setMobileSidebarOpen(false);
					}}
					waitingCount={waitingCount}
					collapsed={collapsed}
					onToggleCollapse={() => setCollapsed(!collapsed)}
					onLogout={handleLogout}
				/>
			</div>

			{/* Right Main Content Canvas */}
			<div className="flex flex-1 flex-col overflow-hidden bg-slate-50">
				<AdminTopNav
					activeTab={activeTab}
					activeCounter={activeCounter}
					onChangeCounter={handleChangeCounter}
					wsConnected={wsConnected}
					onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
				/>

				{/* Scrollable Work Area - Full Width */}
				<main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
					<div className="w-full">
						{error && (
							<div className="mb-6 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800 shadow-xs">
								<span>{error}</span>
								<button
									type="button"
									onClick={() => setError(null)}
									className="text-xs font-bold underline hover:text-rose-950"
								>
									Tutup
								</button>
							</div>
						)}

						{activeTab === 'queues' && (
							<AdminCallConsole
								queues={queues}
								categories={categories}
								acting={acting}
								activeCounter={activeCounter}
								onCall={handleCall}
								onRecall={handleRecall}
								onComplete={handleComplete}
								onSkip={handleSkip}
							/>
						)}

						{activeTab === 'categories' && (
							<AdminCategoryManagement
								onCategoriesChanged={refreshCategories}
								onNavigateToConsole={() => setActiveTab('queues')}
							/>
						)}

						{activeTab === 'print' && (
							<AdminPrintTicket
								categories={categories}
								onTicketCreated={(q) => {
									setQueues((prev) => [...prev, q]);
								}}
							/>
						)}

						{activeTab === 'users' && <AdminUserManagement currentUser={user} />}

						{activeTab === 'tv' && <AdminTVSettings />}

						{activeTab === 'analytics' && (
							<AdminAnalytics queues={queues} categories={categories} />
						)}
					</div>
				</main>
			</div>
		</div>
	);
}