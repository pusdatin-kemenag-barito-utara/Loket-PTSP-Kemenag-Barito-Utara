import React from 'react';
import { api } from '../lib/api';
import { connectRealtime } from '../lib/realtime';
import type { Queue, Stats, WSMessage } from '../lib/types';

function formatNumber(n: number) {
	return String(n).padStart(3, '0');
}

function speak(text: string) {
	if (!('speechSynthesis' in window)) return;
	window.speechSynthesis.cancel();
	const utterance = new SpeechSynthesisUtterance(text);
	utterance.lang = 'id-ID';
	utterance.rate = 1;
	utterance.pitch = 1;
	window.speechSynthesis.speak(utterance);
}

export default function DisplayApp() {
	const [current, setCurrent] = React.useState<Queue | null>(null);
	const [waiting, setWaiting] = React.useState<Queue[]>([]);
	const [history, setHistory] = React.useState<Queue[]>([]);
	const [stats, setStats] = React.useState<Stats | null>(null);
	const [connected, setConnected] = React.useState(false);
	const [now, setNow] = React.useState(new Date());

	React.useEffect(() => {
		const clock = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(clock);
	}, []);

	React.useEffect(() => {
		let cancelled = false;
		const hydrate = async () => {
			try {
				const [waitingList, stat] = await Promise.all([api.waiting(), api.stats()]);
				if (cancelled) return;
				setWaiting(waitingList);
				setStats(stat);
				const active = waitingList.find((q) => q.status === 'called');
				if (active) {
					setCurrent(active);
					setHistory((h) => [active, ...h.filter((x) => x.id !== active.id)]);
				}
			} catch {
				/* show empty state */
			}
		};
		hydrate();
		return () => {
			cancelled = true;
		};
	}, []);

	React.useEffect(() => {
		const conn = connectRealtime((msg: WSMessage) => {
			const data = msg.data as Queue & Partial<Stats>;

			if (msg.type === 'queue_called') {
				setCurrent(data as Queue);
				setWaiting((w) => w.filter((x) => x.id !== (data as Queue).id));
				setHistory((h) => [(data as Queue), ...h.filter((x) => x.id !== (data as Queue).id)].slice(0, 8));
				speak(
					`Nomor ${(data as Queue).category_code}${formatNumber((data as Queue).ticket_number)}, ${(data as Queue).category_name}. Silakan menuju loket.`,
				);
			}

			if (msg.type === 'queue_recalled') {
				setCurrent(data as Queue);
				speak(
					`Mengulang panggilan, nomor ${(data as Queue).category_code}${formatNumber((data as Queue).ticket_number)}, ${(data as Queue).category_name}. Silakan menuju loket.`,
				);
			}

			if (msg.type === 'queue_created') {
				setWaiting((w) => [...w, data as Queue]);
			}

			if (msg.type === 'queue_completed' || msg.type === 'queue_skipped') {
				const q = data as Queue;
				setWaiting((w) => w.filter((x) => x.id !== q.id));
				if (current?.id === q.id) {
					setCurrent(null);
				}
			}

			if (msg.type === 'stats') {
				setStats(data as Stats);
			}
		}, setConnected);

		return () => conn.close();
	}, []);

	const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
	const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

	return (
		<section className="relative flex min-h-screen flex-col bg-night-950 p-6">
			<div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(0,104,56,0.4),transparent_60%)]" />

			<div className="flex items-center justify-between">
				<div>
					<p className="text-lg text-slate-400">{dateStr}</p>
					<p className="text-4xl font-extrabold text-white tabular-nums">{timeStr}</p>
				</div>
				<div className="text-right">
					<span
						className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold ${
							connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
						}`}
					>
						<span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
						{connected ? 'Terhubung' : 'Terputus'}
					</span>
				</div>
			</div>

			<div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
				{/* Current */}
				<div className="flex flex-col justify-center">
					<p className="mb-4 text-center text-lg font-bold uppercase tracking-[0.3em] text-kmenag-gold">
						Sedang Dilayani
					</p>
					{current ? (
						<div className="glass-strong animate-pulse-ring rounded-[2rem] p-10 text-center">
							<p className="text-7xl font-extrabold text-gradient-gold tabular-nums sm:text-8xl">
								{current.category_code}
								{formatNumber(current.ticket_number)}
							</p>
							<p className="mt-4 text-2xl font-bold text-white">{current.category_name}</p>
							<p className="mt-1 text-slate-400">Silakan menuju loket</p>
						</div>
					) : (
						<div className="glass-strong rounded-[2rem] p-10 text-center">
							<p className="text-6xl font-extrabold text-slate-600">Menunggu Panggilan</p>
						</div>
					)}

					{/* History */}
					{history.length > 0 && (
						<div className="mt-6 overflow-hidden">
							<p className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-500">Panggilan Terakhir</p>
							<div className="animate-marquee w-full">
								{history.map((h) => (
									<span key={h.id} className="mx-4 inline-flex items-center gap-2 text-2xl font-bold text-slate-300">
										<span className="text-kmenag-gold">{h.category_code}</span>
										<span className="tabular-nums">{formatNumber(h.ticket_number)}</span>
										<span className="text-sm font-normal text-slate-500">({h.category_name})</span>
									</span>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Waiting */}
				<div className="glass rounded-3xl p-6">
					<p className="text-sm font-bold uppercase tracking-widest text-slate-400">
						Antrian Menunggu <span className="text-kmenag-gold">{waiting.length}</span>
					</p>
					{waiting.length === 0 ? (
						<p className="mt-8 text-center text-slate-600">Tidak ada antrian</p>
					) : (
						<div className="mt-4 flex flex-col gap-2">
							{waiting.slice(0, 10).map((q) => (
								<div key={q.id} className="flex items-center justify-between rounded-xl bg-night-900/50 px-4 py-3">
									<span className="text-xl font-bold text-white">
										{q.category_code}
										<span className="tabular-nums">{formatNumber(q.ticket_number)}</span>
									</span>
									<span className="text-sm text-slate-400">{q.category_name}</span>
								</div>
							))}
							{waiting.length > 10 && (
								<p className="mt-1 text-center text-sm text-slate-500">+{waiting.length - 10} lainnya</p>
							)}
						</div>
					)}

					{stats && (
						<div className="mt-6 border-t border-white/5 pt-4 text-sm text-slate-400">
							<div className="flex justify-between">
								<span>Total hari ini</span>
								<span className="font-bold text-white">{stats.total_today}</span>
							</div>
							<div className="mt-1 flex justify-between">
								<span>Selesai</span>
								<span className="font-bold text-white">{stats.completed}</span>
							</div>
						</div>
					)}
				</div>
			</div>
		</section>
	);
}