import React from 'react';
import { api } from '../lib/api';
import { connectRealtime } from '../lib/realtime';
import { announceQueue, playBankChime } from '../lib/audio';
import { type Category, type Queue, type Stats, type WSMessage, type TVPlaylistItem, DEFAULT_PLAYLIST } from '../lib/types';

import AudioBanner from './tv/AudioBanner';
import TVHeader from './tv/TVHeader';
import TVVideoPlayer from './tv/TVVideoPlayer';
import TVStatsBar from './tv/TVStatsBar';
import TVCallHero from './tv/TVCallHero';
import TVLoketGrid from './tv/TVLoketGrid';
import TVTicker from './tv/TVTicker';
import { ErrorBoundary } from './common/ErrorBoundary';

const DEFAULT_YOUTUBE_ID = '';

const DEFAULT_RUNNING_TEXT =
	'Selamat Datang di Pelayanan Terpadu Satu Pintu (PTSP) Kantor Kementerian Agama Kabupaten Barito Utara  •  Jam Layanan: Senin - Kamis 08.00 - 15.00 WIB | Jumat 08.00 - 15.30 WIB  •  Maklumat Pelayanan: Kami Siap Melayani dengan Sepenuh Hati, Cepat, Tepat, Akuntabel, dan Transparan  •  PTSP Kemenag Barito Utara Menolak Segala Bentuk Gratifikasi, Suap, dan Pungli — Seluruh Pelayanan Bebas Biaya (Gratis) Sesuai Ketentuan Perundang-Undangan  •  Mari Wujudkan Zona Integritas Menuju Wilayah Bebas dari Korupsi (WBK)';

export default function TVDisplay() {
	const [current, setCurrent] = React.useState<Queue | null>(null);
	const [recentlyCalledId, setRecentlyCalledId] = React.useState<string | null>(null);
	const [waiting, setWaiting] = React.useState<Queue[]>([]);
	const [history, setHistory] = React.useState<Queue[]>([]);
	const [categories, setCategories] = React.useState<Category[]>([]);
	const [stats, setStats] = React.useState<Stats | null>(null);
	const [connected, setConnected] = React.useState(false);
	const [now, setNow] = React.useState(new Date());

	// Audio & Settings State (Persisted so user doesn't have to keep clicking "Aktifkan Audio")
	const [audioEnabled, setAudioEnabled] = React.useState<boolean>(() => {
		try {
			return localStorage.getItem('ptsp_tv_audio_unlocked') === 'true';
		} catch {
			return false;
		}
	});
	const [audioUnlocked, setAudioUnlocked] = React.useState<boolean>(() => {
		try {
			return localStorage.getItem('ptsp_tv_audio_unlocked') === 'true';
		} catch {
			return false;
		}
	});
	const [videoId, setVideoId] = React.useState(DEFAULT_YOUTUBE_ID);
	const [mediaMode, setMediaMode] = React.useState<'youtube' | 'local_video' | 'info' | 'video'>('info');
	const [playbackMode, setPlaybackMode] = React.useState<'playlist' | 'single'>('playlist');
	const [playlist, setPlaylist] = React.useState<TVPlaylistItem[]>(DEFAULT_PLAYLIST);
	const [runningText, setRunningText] = React.useState(DEFAULT_RUNNING_TEXT);
	const [customMaklumat, setCustomMaklumat] = React.useState<string>('');
	const [officeAddress, setOfficeAddress] = React.useState<string>('Jl. Jenderal Sudirman No. 20, Muara Teweh, Barito Utara');
	const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
		try {
			const saved = localStorage.getItem('ptsp_tv_theme');
			if (saved === 'dark' || saved === 'light') return saved;
			return 'light';
		} catch {
			return 'light';
		}
	});

	// Load stored settings on mount and listen to storage events
	React.useEffect(() => {
		const syncSettings = () => {
			try {
				const savedTheme = localStorage.getItem('ptsp_tv_theme');
				if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
				const savedVideo = localStorage.getItem('ptsp_tv_video_id');
				if (savedVideo !== null) setVideoId(savedVideo);
				const savedText = localStorage.getItem('ptsp_tv_running_text');
				if (savedText) setRunningText(savedText);
				const savedMode = localStorage.getItem('ptsp_tv_media_mode');
				if (savedMode === 'info' || savedMode === 'video' || savedMode === 'youtube' || savedMode === 'local_video') {
					setMediaMode(savedMode as 'youtube' | 'local_video' | 'info' | 'video');
				}
				const savedPlayback = localStorage.getItem('ptsp_tv_playback_mode');
				if (savedPlayback === 'playlist' || savedPlayback === 'single') {
					setPlaybackMode(savedPlayback);
				}
				const savedPlaylist = localStorage.getItem('ptsp_tv_playlist');
				if (savedPlaylist) {
					try {
						const parsed = JSON.parse(savedPlaylist);
						if (Array.isArray(parsed) && parsed.length > 0) {
							const cleaned = parsed.map((item) =>
								item.type === 'youtube' && item.youtubeId === 'QilYyYax9Q8'
									? {
											...item,
											youtubeId: 'kYJ4-n2V1qM',
											youtubeUrl: 'https://www.youtube.com/watch?v=kYJ4-n2V1qM',
									  }
									: item,
							);
							setPlaylist(cleaned);
						}
					} catch {
						/* ignore */
					}
				}
				const savedMaklumat = localStorage.getItem('ptsp_tv_custom_maklumat');
				if (savedMaklumat) setCustomMaklumat(savedMaklumat);
				const savedAddress = localStorage.getItem('ptsp_tv_office_address');
				if (savedAddress) setOfficeAddress(savedAddress);
			} catch {
				/* ignore */
			}
		};

		syncSettings();
		window.addEventListener('storage', syncSettings);
		return () => window.removeEventListener('storage', syncSettings);
	}, []);

	// Digital Clock Timer
	React.useEffect(() => {
		const timer = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(timer);
	}, []);

	// Initial Data Hydration
	React.useEffect(() => {
		let cancelled = false;
		const initData = async () => {
			try {
				const [waitingList, stat, cats, tvSet] = await Promise.all([
					api.waiting(),
					api.stats(),
					api.categories(),
					api.tvSettings().catch(() => null),
				]);
				if (cancelled) return;

				const safeWaiting = Array.isArray(waitingList) ? waitingList : [];
				const safeCats = Array.isArray(cats) ? cats.filter((c) => c && c.is_active !== false) : [];

				setWaiting(safeWaiting);
				setStats(stat);
				setCategories(safeCats);

				if (tvSet) {
					if (tvSet.playback_mode) setPlaybackMode(tvSet.playback_mode);
					if (tvSet.single_mode) setMediaMode(tvSet.single_mode);
					if (tvSet.video_id) setVideoId(tvSet.video_id);
					if (tvSet.running_text) setRunningText(tvSet.running_text);
					if (tvSet.custom_maklumat) setCustomMaklumat(tvSet.custom_maklumat);
					if (tvSet.office_address) setOfficeAddress(tvSet.office_address);
					if (tvSet.theme === 'light' || tvSet.theme === 'dark') {
						setTheme(tvSet.theme);
						try {
							localStorage.setItem('ptsp_tv_theme', tvSet.theme);
						} catch {}
					}
					if (Array.isArray(tvSet.playlist) && tvSet.playlist.length > 0) {
						setPlaylist(tvSet.playlist);
						try {
							localStorage.setItem('ptsp_tv_playlist', JSON.stringify(tvSet.playlist));
						} catch {}
					}
				}

				const active = safeWaiting.find((q) => q && q.status === 'called');
				if (active) {
					setCurrent(active);
					setHistory([active]);
				}
			} catch (err) {
				console.error('Failed to load display data:', err);
			}
		};
		initData();
		return () => {
			cancelled = true;
		};
	}, []);

	// WebSocket Realtime Queue Events & Settings Sync
	React.useEffect(() => {
		const conn = connectRealtime((msg: WSMessage) => {
			const data = msg.data as Queue & Partial<Stats>;

			if (msg.type === 'queue_called') {
				const q = data as Queue;
				setCurrent(q);
				setWaiting((prev) => prev.filter((item) => item.id !== q.id));
				setHistory((prev) => [q, ...prev.filter((item) => item.id !== q.id)].slice(0, 8));

				setRecentlyCalledId(q.id);
				setTimeout(() => setRecentlyCalledId(null), 8000);

				announceQueue(q, audioEnabled);
			}

			if (msg.type === 'queue_recalled') {
				const q = data as Queue;
				setCurrent(q);
				setRecentlyCalledId(q.id);
				setTimeout(() => setRecentlyCalledId(null), 8000);

				announceQueue(q, audioEnabled);
			}

			if (msg.type === 'queue_created') {
				const q = data as Queue;
				setWaiting((prev) => [...prev, q]);
			}

			if (msg.type === 'queue_completed' || msg.type === 'queue_skipped') {
				const q = data as Queue;
				setWaiting((prev) => prev.filter((item) => item.id !== q.id));
				if (current?.id === q.id) {
					setCurrent(null);
				}
			}

			if (msg.type === 'stats') {
				setStats(data as Stats);
			}

			if (msg.type === 'tv_settings_updated') {
				const set = msg.data as any;
				if (set) {
					let pl = set.playlist;
					if (typeof pl === 'string') {
						try {
							pl = JSON.parse(pl);
						} catch {}
					}
					if (set.playback_mode) setPlaybackMode(set.playback_mode);
					if (set.single_mode) setMediaMode(set.single_mode);
					if (set.video_id) setVideoId(set.video_id);
					if (set.running_text) setRunningText(set.running_text);
					if (set.custom_maklumat) setCustomMaklumat(set.custom_maklumat);
					if (set.office_address) setOfficeAddress(set.office_address);
					if (set.theme === 'light' || set.theme === 'dark') {
						setTheme(set.theme);
						try {
							localStorage.setItem('ptsp_tv_theme', set.theme);
						} catch {}
					}
					if (Array.isArray(pl) && pl.length > 0) {
						setPlaylist(pl);
						try {
							localStorage.setItem('ptsp_tv_playlist', JSON.stringify(pl));
						} catch {}
					}
				}
			}

			if (msg.type === 'categories_updated') {
				const updatedCats = msg.data as Category[];
				if (Array.isArray(updatedCats)) {
					setCategories(updatedCats.filter((c) => c && c.is_active !== false));
				}
			}
		}, setConnected);

		return () => conn.close();
	}, [audioEnabled, current]);

	// Auto-unlock audio on first user click/interaction anywhere if previously enabled
	React.useEffect(() => {
		const autoUnlock = () => {
			try {
				if (localStorage.getItem('ptsp_tv_audio_unlocked') === 'true') {
					setAudioEnabled(true);
					setAudioUnlocked(true);
				}
			} catch {}
		};
		window.addEventListener('click', autoUnlock, { once: true });
		window.addEventListener('keydown', autoUnlock, { once: true });
		return () => {
			window.removeEventListener('click', autoUnlock);
			window.removeEventListener('keydown', autoUnlock);
		};
	}, []);

	// Audio controls
	const handleEnableAudio = () => {
		playBankChime();
		setAudioEnabled(true);
		setAudioUnlocked(true);
		try {
			localStorage.setItem('ptsp_tv_audio_unlocked', 'true');
		} catch {}
	};

	const handleToggleAudio = () => {
		if (!audioEnabled) {
			handleEnableAudio();
		} else {
			setAudioEnabled(false);
			try {
				localStorage.setItem('ptsp_tv_audio_unlocked', 'false');
			} catch {}
		}
	};

	// Fullscreen handler
	const handleToggleFullscreen = () => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().catch(() => {});
		} else {
			document.exitFullscreen().catch(() => {});
		}
	};

	const isLight = theme === 'light';

	return (
		<div
			className={`relative flex h-screen w-screen flex-col overflow-hidden font-sans select-none transition-colors duration-300 ${
				isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-100'
			}`}
			style={isLight ? { backgroundColor: '#f1f5f9' } : { backgroundColor: '#020617' }}
		>
			{/* Ambient Backlight Glow */}
			{isLight ? (
				<div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(0,104,56,0.08),transparent_65%)]" />
			) : (
				<>
					<div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(0,104,56,0.35),transparent_65%)]" />
					<div className="pointer-events-none absolute bottom-0 right-0 -z-10 h-96 w-96 rounded-full bg-kmenag-gold/5 blur-3xl" />
				</>
			)}

			{/* 1. Dedicated TV Header Bar */}
			<TVHeader
				connected={connected}
				now={now}
				audioEnabled={audioEnabled}
				theme={theme}
				onToggleAudio={handleToggleAudio}
				onToggleFullscreen={handleToggleFullscreen}
			/>

			{/* 2. Audio Permission Unlock Banner */}
			<AudioBanner unlocked={audioUnlocked} onEnable={handleEnableAudio} />

			{/* 3. Main Widescreen Body (7 cols Media + 5 cols Queue) */}
			<main className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-3.5 sm:p-4 lg:grid-cols-12 min-h-0">
				{/* Left Column: Media Presentation / Video & Live Stats */}
				<div className="flex flex-col gap-3.5 lg:col-span-7 h-full min-h-0 justify-between">
					<ErrorBoundary>
						<TVVideoPlayer
							playbackMode={playbackMode}
							singleMode={mediaMode}
							playlist={playlist}
							videoId={videoId}
							customMaklumat={customMaklumat}
							audioEnabled={audioEnabled}
							isCallingQueue={Boolean(recentlyCalledId)}
							theme={theme}
						/>
					</ErrorBoundary>
					<TVStatsBar
						stats={stats}
						waitingCount={(waiting || []).length}
						calledCount={current ? 1 : 0}
						theme={theme}
					/>
				</div>

				{/* Right Column: Hero Active Call & Multi-Loket Grid */}
				<div className="flex flex-col gap-3.5 lg:col-span-5 h-full min-h-0 justify-between">
					<TVCallHero
						current={current}
						isRecentlyCalled={Boolean(current && recentlyCalledId === current.id)}
						history={history}
						theme={theme}
					/>
					<TVLoketGrid
						categories={categories || []}
						waitingList={waiting || []}
						currentQueue={current}
						recentlyCalledId={recentlyCalledId}
						theme={theme}
					/>
				</div>
			</main>

			{/* 4. Running Text Marquee Footer */}
			<TVTicker runningText={runningText} theme={theme} />
		</div>
	);
}
