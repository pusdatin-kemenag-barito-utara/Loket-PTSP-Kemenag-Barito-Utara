import React from 'react';
import { ShieldCheckIcon, ClockIcon } from '../common/Icons';
import { getLocalVideoBlob, cacheRemoteVideo, extractYouTubeId } from '../../lib/videoStorage';
import type { TVPlaylistItem } from '../../lib/types';

interface TVVideoPlayerProps {
	playbackMode?: 'playlist' | 'single';
	singleMode?: 'youtube' | 'local_video' | 'info' | 'video';
	playlist?: TVPlaylistItem[];
	videoId: string;
	customMaklumat?: string;
	agencyTitle?: string;
	agencyTagline?: string;
	audioEnabled?: boolean;
	isCallingQueue?: boolean;
	theme?: 'light' | 'dark';
}

export default function TVVideoPlayer({
	playbackMode = 'playlist',
	singleMode = 'info',
	playlist = [],
	videoId,
	customMaklumat,
	agencyTitle = 'KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA',
	agencyTagline = 'Pelayanan Terpadu Satu Pintu (PTSP) • IKHLAS BERAMAL',
	audioEnabled = false,
	isCallingQueue = false,
	theme = 'light',
}: TVVideoPlayerProps) {
	const [localVideoUrl, setLocalVideoUrl] = React.useState<string | null>(null);
	const [videoProgress, setVideoProgress] = React.useState(0);
	const iframeRef = React.useRef<HTMLIFrameElement>(null);
	const videoRef = React.useRef<HTMLVideoElement>(null);

	// Active Playlist items
	const activePlaylist = playlist.filter((p) => p.enabled);
	const isPlaylistMode = playbackMode === 'playlist' && activePlaylist.length > 0;

	const [playlistIndex, setPlaylistIndex] = React.useState(0);
	const [secondsRemaining, setSecondsRemaining] = React.useState(0);
	const [totalDuration, setTotalDuration] = React.useState(20);

	const currentItem = isPlaylistMode
		? activePlaylist[playlistIndex % activePlaylist.length]
		: null;

	// Determine active media mode
	const currentMode = isPlaylistMode && currentItem
		? currentItem.type
		: singleMode === 'video'
		? 'youtube'
		: singleMode;

	const [isFading, setIsFading] = React.useState(false);
	const isAdvancingRef = React.useRef(false);

	// Advance to next item in playlist with smooth crossfade animation
	const advanceToNext = React.useCallback(() => {
		if (isAdvancingRef.current) return;
		if (!isPlaylistMode || activePlaylist.length === 0) return;

		isAdvancingRef.current = true;
		setIsFading(true);

		setTimeout(() => {
			if (activePlaylist.length > 1) {
				setPlaylistIndex((prev) => (prev + 1) % activePlaylist.length);
			} else {
				// Single item playlist: replay from start smoothly
				if (iframeRef.current?.contentWindow) {
					try {
						iframeRef.current.contentWindow.postMessage(
							JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }),
							'*'
						);
						iframeRef.current.contentWindow.postMessage(
							JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
							'*'
						);
					} catch {}
				}
				if (videoRef.current) {
					videoRef.current.currentTime = 0;
					videoRef.current.play().catch(() => {});
				}
			}
			setVideoProgress(0);

			setTimeout(() => {
				setIsFading(false);
				setTimeout(() => {
					isAdvancingRef.current = false;
				}, 600);
			}, 150);
		}, 400);
	}, [isPlaylistMode, activePlaylist.length]);

function getEffectiveVideoUrl(url?: string): string | null {
	if (!url) return null;
	// Convert any r2.dev domain (blocked by Indonesian ISPs) to backend stream endpoint
	const r2Match = url.match(/r2\.dev\/(.+)$/);
	if (r2Match && r2Match[1]) {
		return `/api/v1/media/stream/${r2Match[1]}`;
	}
	return url;
}

	// Load stored video from IndexedDB or Cloudflare R2 whenever current item changes
	React.useEffect(() => {
		let active = true;
		let createdUrl: string | null = null;

		if (currentMode === 'local_video') {
			const targetId = currentItem?.localVideoId || currentItem?.id;
			const rawUrl = currentItem?.videoUrl;
			const remoteUrl = getEffectiveVideoUrl(rawUrl);

			// Check local IndexedDB cache first
			getLocalVideoBlob(targetId).then((res) => {
				if (!active) return;
				if (res?.blob && res.blob.size > 1000) {
					createdUrl = URL.createObjectURL(res.blob);
					setLocalVideoUrl(createdUrl);
				} else if (remoteUrl) {
					// Fallback to streaming directly from Cloudflare R2 / backend immediately
					setLocalVideoUrl(remoteUrl);

					// Auto-cache to IndexedDB in background so future loops/reloads are 100% offline!
					cacheRemoteVideo(remoteUrl, targetId || `video_${Date.now()}`, currentItem?.title || 'Video')
						.catch(() => {});
				} else {
					setLocalVideoUrl(null);
				}
			});
		}

		return () => {
			active = false;
			if (createdUrl && createdUrl.startsWith('blob:')) {
				URL.revokeObjectURL(createdUrl);
			}
		};
	}, [currentMode, currentItem?.id, currentItem?.localVideoId, currentItem?.videoUrl]);

	// Handle YouTube postMessage events (onStateChange ENDED = 0, advance to next video)
	React.useEffect(() => {
		if (currentMode !== 'youtube' || !isPlaylistMode) return;

		const handleMessage = (event: MessageEvent) => {
			try {
				let data = event.data;
				if (typeof data === 'string') {
					try {
						data = JSON.parse(data);
					} catch {
						return;
					}
				}
				if (!data || typeof data !== 'object') return;

				// YouTube Iframe API state: 0 = ENDED
				if (data.event === 'onStateChange' && (data.info === 0 || data.info === '0')) {
					advanceToNext();
					return;
				}

				// infoDelivery events:
				if (data.event === 'infoDelivery' && data.info) {
					// playerState 0 = ENDED
					if (data.info.playerState === 0 || data.info.playerState === '0') {
						advanceToNext();
						return;
					}
					// currentTime near duration end (last 0.8s of the video)
					const currentTime = data.info.currentTime;
					const duration = data.info.duration;
					if (
						typeof currentTime === 'number' &&
						typeof duration === 'number' &&
						duration > 2 &&
						currentTime >= duration - 0.8
					) {
						advanceToNext();
						return;
					}
				}
			} catch {
				/* ignore non-json messages */
			}
		};

		window.addEventListener('message', handleMessage);

		// Send periodic handshake ping & query to YouTube iframe so it sends state/time updates
		const pingInterval = setInterval(() => {
			if (iframeRef.current?.contentWindow) {
				try {
					iframeRef.current.contentWindow.postMessage(
						JSON.stringify({ event: 'listening' }),
						'*'
					);
					iframeRef.current.contentWindow.postMessage(
						JSON.stringify({ event: 'command', func: 'getCurrentTime', args: [] }),
						'*'
					);
					iframeRef.current.contentWindow.postMessage(
						JSON.stringify({ event: 'command', func: 'getDuration', args: [] }),
						'*'
					);
				} catch {}
			}
		}, 1000);

		// Safety fallback timer for YouTube (e.g. 5 minutes) if iframe API doesn't notify
		const safetyTimer = setTimeout(() => {
			advanceToNext();
		}, 300000);

		return () => {
			window.removeEventListener('message', handleMessage);
			clearInterval(pingInterval);
			clearTimeout(safetyTimer);
		};
	}, [currentMode, isPlaylistMode, currentItem?.id, advanceToNext]);

	// Slide Countdown Timer (Khusus tipe 'info' / slide grafis)
	React.useEffect(() => {
		if (!isPlaylistMode || !currentItem || currentItem.type !== 'info') return;

		const duration = Math.max(5, currentItem.durationSeconds || 20);
		setTotalDuration(duration);
		setSecondsRemaining(duration);

		const interval = setInterval(() => {
			setSecondsRemaining((prev) => {
				if (prev <= 1) {
					advanceToNext();
					return duration;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [isPlaylistMode, currentItem?.id, currentItem?.durationSeconds, advanceToNext]);

	// Determine effective YouTube ID (resolves full link or 11-char ID)
	let rawYtId = currentItem?.type === 'youtube'
		? (currentItem.youtubeId || currentItem.youtubeUrl || '')
		: videoId;

	let cleanId = extractYouTubeId(rawYtId) || rawYtId;

	// If the browser has the stale non-existent ID 'QilYyYax9Q8', fallback to official Mars Kemenag video
	if (cleanId === 'QilYyYax9Q8' || !cleanId) {
		cleanId = 'kYJ4-n2V1qM';
	}
	const effectiveYoutubeId = cleanId;

	const isYouTube = currentMode === 'youtube' && Boolean(effectiveYoutubeId);
	const isLocalVideo = currentMode === 'local_video';

	// Audio Ducking: Video plays with sound if audioEnabled is active,
	// but temporarily mutes when a queue number is being called.
	const isMuted = !audioEnabled || Boolean(isCallingQueue);

	// Synchronize mute/unmute to YouTube iframe via YouTube API postMessage
	React.useEffect(() => {
		if (!iframeRef.current?.contentWindow) return;
		try {
			if (isMuted) {
				iframeRef.current.contentWindow.postMessage(
					JSON.stringify({ event: 'command', func: 'mute', args: [] }),
					'*'
				);
			} else {
				iframeRef.current.contentWindow.postMessage(
					JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
					'*'
				);
				iframeRef.current.contentWindow.postMessage(
					JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }),
					'*'
				);
			}
		} catch {}
	}, [isMuted]);

	// Unload captions / subtitles on iframe ready, register handshake, and sync audio
	const handleIframeLoad = () => {
		if (!iframeRef.current?.contentWindow) return;
		try {
			// Register listening event so YouTube iframe posts back state changes!
			iframeRef.current.contentWindow.postMessage(
				JSON.stringify({ event: 'listening' }),
				'*',
			);
			// Explicitly command YouTube player to unload subtitle / CC modules
			iframeRef.current.contentWindow.postMessage(
				JSON.stringify({ event: 'command', func: 'unloadModule', args: ['captions'] }),
				'*',
			);
			iframeRef.current.contentWindow.postMessage(
				JSON.stringify({ event: 'command', func: 'unloadModule', args: ['cc'] }),
				'*',
			);
			iframeRef.current.contentWindow.postMessage(
				JSON.stringify({ event: 'command', func: 'setOption', args: ['captions', 'track', {}] }),
				'*',
			);

			// Synchronize mute/unmute and volume
			if (isMuted) {
				iframeRef.current.contentWindow.postMessage(
					JSON.stringify({ event: 'command', func: 'mute', args: [] }),
					'*'
				);
			} else {
				iframeRef.current.contentWindow.postMessage(
					JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
					'*'
				);
				iframeRef.current.contentWindow.postMessage(
					JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }),
					'*'
				);
			}
		} catch {}
	};

	// Synchronize mute/unmute to HTML5 video element
	React.useEffect(() => {
		if (videoRef.current) {
			videoRef.current.muted = isMuted;
			if (!isMuted) {
				videoRef.current.volume = 1.0;
			}
		}
	}, [isMuted]);

	// Determine Theme Gradient for Slide Info
	const isIstirahat = Boolean(
		currentItem?.slideBadge?.toLowerCase()?.includes('istirahat') ||
		currentItem?.title?.toLowerCase()?.includes('istirahat')
	);

	const slideBgGradient = isIstirahat
		? 'linear-gradient(145deg, #78350f 0%, #1e1b4b 60%, #020617 100%)'
		: 'linear-gradient(145deg, #064e3b 0%, #0b1329 55%, #020617 100%)';

	const badgeColor = isIstirahat
		? 'border-amber-500/30 bg-amber-500/20 text-amber-300'
		: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';

	return (
		<div
			className={`relative w-full aspect-video shrink-0 overflow-hidden rounded-3xl border flex flex-col justify-between transition-colors duration-300 ${
				theme === 'light'
					? 'border-slate-200/90 bg-slate-950 shadow-md'
					: 'border-slate-800/80 bg-slate-950 shadow-2xl'
			}`}
		>
			{/* Media Renderers with Smooth Crossfade Animation */}
			<div
				className={`relative h-full w-full transition-all duration-500 ease-in-out ${
					isFading
						? 'opacity-0 scale-[0.98] filter blur-sm'
						: 'opacity-100 scale-100 filter blur-0'
				}`}
			>
				{isYouTube ? (
					/* YouTube Video Player (Edge-to-edge cinematic crop, no title bar/frame/captions, 1080p, auto-advance on complete) */
					<div className="relative h-full w-full bg-black overflow-hidden pointer-events-none select-none">
						<iframe
							ref={iframeRef}
							key={effectiveYoutubeId}
							onLoad={handleIframeLoad}
							src={`https://www.youtube.com/embed/${effectiveYoutubeId}?autoplay=1&mute=${isMuted ? '1' : '0'}&controls=0&loop=0&playsinline=1&cc_load_policy=3&cc_lang_pref=none&iv_load_policy=3&modestbranding=1&rel=0&vq=hd1080&enablejsapi=1`}
							title="Video Informasi Layanan"
							className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[124%] h-[124%] pointer-events-none select-none border-0"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							referrerPolicy="strict-origin-when-cross-origin"
							allowFullScreen
						/>
					</div>
				) : isLocalVideo ? (
					/* Local / R2 Video Player (Exact 16:9 canvas with automatic next onEnded) */
					<div className="relative h-full w-full bg-black overflow-hidden flex items-center justify-center">
						{localVideoUrl ? (
							<video
								ref={videoRef}
								key={localVideoUrl}
								src={localVideoUrl}
								autoPlay
								muted={isMuted}
								playsInline
								preload="auto"
								controls={false}
								onCanPlay={(e) => {
									const v = e.currentTarget;
									const p = v.play();
									if (p !== undefined) {
										p.catch(() => {
											// If browser blocked unmuted autoplay, mute and resume immediately
											v.muted = true;
											v.play().catch(() => {});
										});
									}
								}}
								onError={(e) => {
									console.warn('Video failed to play, advancing to next item:', e);
									setTimeout(() => {
										advanceToNext();
									}, 3000);
								}}
								onTimeUpdate={(e) => {
									const v = e.currentTarget;
									if (v.duration) {
										setVideoProgress((v.currentTime / v.duration) * 100);
									}
								}}
								onEnded={() => {
									advanceToNext();
								}}
								className="absolute inset-0 h-full w-full object-cover bg-black"
							/>
						) : (
							<div className="flex flex-col items-center gap-3 text-slate-400">
								<div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-500" />
								<span className="text-xs font-semibold tracking-wide">Menyiapkan Video...</span>
							</div>
						)}
					</div>
				) : (
					/* Dynamic Presentation Slide (Maklumat, Jam Istirahat, Pengumuman, dll) */
					<div
						className="flex h-full flex-col justify-between p-8 text-white select-none transition-opacity duration-700"
						style={{ background: slideBgGradient }}
					>
					{/* Header Slide */}
					<div className="flex items-center justify-between border-b border-white/10 pb-5">
						<div className="flex items-center gap-4">
							<img
								src="/kemenag.svg"
								alt="Kemenag"
								className="h-12 w-12 drop-shadow-[0_0_12px_rgba(255,199,44,0.4)]"
							/>
							<div>
								<h2 className="text-base font-black tracking-wide text-white sm:text-lg">
									{currentItem?.slideHeading || 'MAKLUMAT PELAYANAN PTSP'}
								</h2>
								<p className="text-xs font-bold tracking-widest text-amber-400 uppercase">
									{currentItem?.slideSubheading || agencyTitle}
								</p>
							</div>
						</div>
						<span
							className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold ${badgeColor}`}
						>
							{isIstirahat ? (
								<ClockIcon className="h-4 w-4" />
							) : (
								<ShieldCheckIcon className="h-4 w-4" />
							)}
							<span>{currentItem?.slideBadge || 'Zona Integritas WBK'}</span>
						</span>
					</div>

					{/* Content Body */}
					<div className="my-auto space-y-5 py-4">
						<div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-lg">
							<p className="text-base font-medium leading-relaxed text-slate-100 italic sm:text-lg">
								{currentItem?.slideContent ||
									customMaklumat ||
									'“Dengan ini kami menyatakan sanggup menyelenggarakan pelayanan sesuai standar pelayanan yang telah ditetapkan dan apabila tidak menepati janji ini, kami siap menerima sanksi sesuai peraturan perundang-undangan yang berlaku.”'}
							</p>
						</div>

						{/* 2 Info Cards */}
						<div className="grid grid-cols-2 gap-4">
							<div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
								<p className="text-xs font-black tracking-wider text-emerald-400 uppercase">
									{currentItem?.slideCard1Title || 'Standar Pelayanan'}
								</p>
								<p className="mt-1 text-base font-bold text-white">
									{currentItem?.slideCard1Text || 'Bebas Biaya (Gratis 100%)'}
								</p>
							</div>
							<div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
								<p className="text-xs font-black tracking-wider text-amber-300 uppercase">
									{currentItem?.slideCard2Title || 'Komitmen Integritas'}
								</p>
								<p className="mt-1 text-base font-bold text-white">
									{currentItem?.slideCard2Text || 'Tolak Gratifikasi & Suap'}
								</p>
							</div>
						</div>
					</div>
				</div>
			)}
			</div>
		</div>
	);
}
