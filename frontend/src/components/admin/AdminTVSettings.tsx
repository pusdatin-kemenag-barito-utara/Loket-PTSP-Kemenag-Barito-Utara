import React from 'react';
import { api } from '../../lib/api';
import { playBankChime, announceQueue, type ChimeTone } from '../../lib/audio';
import {
	saveLocalVideo,
	getLocalVideoBlob,
	deleteLocalVideo,
	extractYouTubeId,
	type StoredVideoItem,
} from '../../lib/videoStorage';
import ModernSelect from '../common/ModernSelect';
import Toast, { type ToastData } from '../common/Toast';
import ConfirmModal from '../common/ConfirmModal';
import {
	TvIcon,
	BellIcon,
	ArrowPathIcon,
	CheckCircleIcon,
	ShieldCheckIcon,
	TrashIcon,
	PlusIcon,
	PencilIcon,
	ClockIcon,
	XMarkIcon,
} from '../common/Icons';
import { DEFAULT_PLAYLIST, type TVPlaylistItem, type MediaItemType } from '../../lib/types';

const DEFAULT_RUNNING_TEXT =
	'Selamat Datang di Pelayanan Terpadu Satu Pintu (PTSP) Kantor Kementerian Agama Kabupaten Barito Utara  •  Jam Layanan: Senin - Kamis 08.00 - 15.00 WIB | Jumat 08.00 - 15.30 WIB  •  Maklumat Pelayanan: Kami Siap Melayani dengan Sepenuh Hati, Cepat, Tepat, Akuntabel, dan Transparan  •  PTSP Kemenag Barito Utara Menolak Segala Bentuk Gratifikasi, Suap, dan Pungli — Seluruh Pelayanan Bebas Biaya (Gratis) Sesuai Ketentuan Perundang-Undangan  •  Mari Wujudkan Zona Integritas Menuju Wilayah Bebas dari Korupsi (WBK)';

const DEFAULT_MAKLUMAT =
	'“Dengan ini kami menyatakan sanggup menyelenggarakan pelayanan sesuai standar pelayanan yang telah ditetapkan dan apabila tidak menepati janji ini, kami siap menerima sanksi sesuai peraturan perundang-undangan yang berlaku.”';

const DEFAULT_ADDRESS = 'Jl. Jenderal Sudirman No. 20, Muara Teweh, Barito Utara';

export default function AdminTVSettings() {
	// Playback Mode: Playlist Carousel Loop vs Single Content
	const [playbackMode, setPlaybackMode] = React.useState<'playlist' | 'single'>('playlist');
	const [singleMode, setSingleMode] = React.useState<MediaItemType>('info');
	const [playlist, setPlaylist] = React.useState<TVPlaylistItem[]>(DEFAULT_PLAYLIST);

	// Running Text & Info
	const [runningText, setRunningText] = React.useState(DEFAULT_RUNNING_TEXT);
	const [officeAddress, setOfficeAddress] = React.useState(DEFAULT_ADDRESS);

	// TV Theme: Light (Clean White) vs Dark Mode
	const [theme, setTheme] = React.useState<'light' | 'dark'>('light');

	// Audio & Chime
	const [chimeTone, setChimeTone] = React.useState<ChimeTone>('bank');
	const [voiceRate, setVoiceRate] = React.useState<string>('0.9');

	// Floating Toaster Notification & Saving State
	const [toast, setToast] = React.useState<ToastData | null>(null);
	const [isSaving, setIsSaving] = React.useState(false);

	// Uploading Local Video State
	const [isUploadingVideo, setIsUploadingVideo] = React.useState(false);
	const videoFileInputRef = React.useRef<HTMLInputElement>(null);

	// Modal States for Add / Edit
	const [editingItem, setEditingItem] = React.useState<TVPlaylistItem | null>(null);
	const [modalType, setModalType] = React.useState<'add_youtube' | 'add_slide' | 'edit' | null>(null);

	// Custom Confirmation Modal for Deleting Playlist Item
	const [deleteConfirmItem, setDeleteConfirmItem] = React.useState<{ item: TVPlaylistItem; index: number } | null>(null);

	// Temp states for YouTube Form
	const [ytFormTitle, setYtFormTitle] = React.useState('');
	const [ytFormUrl, setYtFormUrl] = React.useState('');

	// Temp states for Slide Form
	const [slideFormTitle, setSlideFormTitle] = React.useState('');
	const [slideFormDuration, setSlideFormDuration] = React.useState(20);
	const [slideFormBadge, setSlideFormBadge] = React.useState('');
	const [slideFormHeading, setSlideFormHeading] = React.useState('');
	const [slideFormSubheading, setSlideFormSubheading] = React.useState('');
	const [slideFormContent, setSlideFormContent] = React.useState('');
	const [slideFormCard1Title, setSlideFormCard1Title] = React.useState('');
	const [slideFormCard1Text, setSlideFormCard1Text] = React.useState('');
	const [slideFormCard2Title, setSlideFormCard2Title] = React.useState('');
	const [slideFormCard2Text, setSlideFormCard2Text] = React.useState('');

	// Load stored settings on mount (localStorage first, then server database)
	React.useEffect(() => {
		try {
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

			const savedSingle = localStorage.getItem('ptsp_tv_media_mode');
			if (savedSingle === 'youtube' || savedSingle === 'local_video' || savedSingle === 'info') {
				setSingleMode(savedSingle);
			}

			const savedText = localStorage.getItem('ptsp_tv_running_text');
			if (savedText) setRunningText(savedText);

			const savedAddress = localStorage.getItem('ptsp_tv_office_address');
			if (savedAddress) setOfficeAddress(savedAddress);

			const savedTheme = localStorage.getItem('ptsp_tv_theme') as 'light' | 'dark';
			if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);

			const savedChime = localStorage.getItem('ptsp_tv_chime_tone') as ChimeTone;
			if (savedChime) setChimeTone(savedChime);

			const savedRate = localStorage.getItem('ptsp_tv_voice_rate');
			if (savedRate) setVoiceRate(savedRate);
		} catch {
			/* ignore */
		}

		// Fetch latest settings from database (Supabase via Go backend)
		api.tvSettings()
			.then((res) => {
				if (!res) return;
				if (res.playback_mode === 'playlist' || res.playback_mode === 'single') {
					setPlaybackMode(res.playback_mode);
				}
				if (res.single_mode === 'youtube' || res.single_mode === 'local_video' || res.single_mode === 'info') {
					setSingleMode(res.single_mode);
				}
				if (res.running_text) {
					setRunningText(res.running_text);
				}
				if (res.office_address) {
					setOfficeAddress(res.office_address);
				}
				if (res.theme === 'light' || res.theme === 'dark') {
					setTheme(res.theme);
				}
				if (Array.isArray(res.playlist) && res.playlist.length > 0) {
					setPlaylist(res.playlist);
				}
			})
			.catch((err) => {
				console.warn('Could not load remote TV settings:', err);
			});
	}, []);

	// Save all settings to database & localStorage & dispatch storage event for cross-tab sync
	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);
		try {
			// First active youtube video id if available
			const activeYt = playlist.find((p) => p.type === 'youtube' && p.enabled && p.youtubeId);
			const effectiveVideoId = activeYt?.youtubeId || '';

			// 1. Save to backend database & broadcast via Hub WebSocket to TV Display
			await api
				.updateTVSettings({
					playback_mode: playbackMode,
					single_mode: singleMode,
					video_id: effectiveVideoId,
					running_text: runningText.trim() || DEFAULT_RUNNING_TEXT,
					custom_maklumat: DEFAULT_MAKLUMAT,
					office_address: officeAddress.trim() || DEFAULT_ADDRESS,
					playlist: playlist,
					theme: theme,
				})
				.catch((err) => {
					console.warn('Backend TV settings save failed, falling back to local storage:', err);
				});

			// 2. Persist to local storage for immediate tab sync
			localStorage.setItem('ptsp_tv_playback_mode', playbackMode);
			localStorage.setItem('ptsp_tv_theme', theme);
			localStorage.setItem('ptsp_tv_playlist', JSON.stringify(playlist));
			localStorage.setItem('ptsp_tv_media_mode', singleMode);
			if (effectiveVideoId) {
				localStorage.setItem('ptsp_tv_video_id', effectiveVideoId);
			}

			localStorage.setItem('ptsp_tv_running_text', runningText.trim() || DEFAULT_RUNNING_TEXT);
			localStorage.setItem('ptsp_tv_office_address', officeAddress.trim() || DEFAULT_ADDRESS);
			localStorage.setItem('ptsp_tv_chime_tone', chimeTone);
			localStorage.setItem('ptsp_tv_voice_rate', voiceRate);

			window.dispatchEvent(new Event('storage'));

			setToast({
				type: 'success',
				title: 'Pengaturan Berhasil Disimpan & Diterapkan!',
				message:
					playbackMode === 'playlist'
						? `Playlist ${playlist.filter((p) => p.enabled).length} tayangan aktif tersimpan ke Cloud/Database dan langsung disinkronkan ke Layar TV Kantor via Realtime WebSocket.`
						: 'Mode tayangan tunggal berhasil diterapkan di Layar TV Monitor.',
			});
		} catch (err) {
			setToast({
				type: 'error',
				title: 'Gagal Menyimpan Pengaturan',
				message: err instanceof Error ? err.message : 'Terjadi kendala saat menyimpan pengaturan.',
			});
		} finally {
			setIsSaving(false);
		}
	};

	// Playlist Ordering Helpers
	const moveItem = (index: number, direction: 'up' | 'down') => {
		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= playlist.length) return;

		const updated = [...playlist];
		const temp = updated[index];
		updated[index] = updated[targetIndex];
		updated[targetIndex] = temp;
		setPlaylist(updated);
	};

	const toggleItemEnabled = (index: number) => {
		const updated = [...playlist];
		updated[index].enabled = !updated[index].enabled;
		setPlaylist(updated);
	};

	const updateItemDuration = (index: number, seconds: number) => {
		const updated = [...playlist];
		updated[index].durationSeconds = Math.max(5, seconds);
		setPlaylist(updated);
	};

	const handleDeleteItem = (index: number) => {
		if (playlist.length <= 1) {
			setToast({
				type: 'info',
				title: 'Tidak Dapat Dihapus',
				message: 'Minimal harus ada 1 tayangan di dalam daftar putar TV.',
			});
			return;
		}
		const item = playlist[index];
		setDeleteConfirmItem({ item, index });
	};

	const handleConfirmDelete = () => {
		if (!deleteConfirmItem) return;
		const { item, index } = deleteConfirmItem;

		// If local video, also delete from IndexedDB
		if (item.type === 'local_video' && item.localVideoId) {
			deleteLocalVideo(item.localVideoId);
		}
		const updated = playlist.filter((_, i) => i !== index);
		setPlaylist(updated);

		// Synchronize to backend database
		api.updateTVSettings({
			playback_mode: playbackMode,
			single_mode: singleMode,
			running_text: runningText,
			office_address: officeAddress,
			playlist: updated,
		}).catch(() => {});

		try {
			localStorage.setItem('ptsp_tv_playlist', JSON.stringify(updated));
			window.dispatchEvent(new Event('storage'));
		} catch {}

		setDeleteConfirmItem(null);
		setToast({
			type: 'info',
			title: 'Tayangan Dihapus',
			message: `"${item.title}" telah dihapus dari urutan tayangan TV.`,
		});
	};

	// Add YouTube Item Modal Handlers
	const openAddYoutubeModal = () => {
		setYtFormTitle('');
		setYtFormUrl('');
		setModalType('add_youtube');
	};

	const handleSaveNewYoutube = (e: React.FormEvent) => {
		e.preventDefault();
		const extractedId = extractYouTubeId(ytFormUrl);
		if (!extractedId) {
			setToast({
				type: 'error',
				title: 'Tautan YouTube Tidak Valid',
				message: 'Mohon masukkan link YouTube atau ID 11 karakter yang benar.',
			});
			return;
		}

		const newItem: TVPlaylistItem = {
			id: `yt_${Date.now()}`,
			type: 'youtube',
			title: ytFormTitle.trim() || `Video YouTube (${extractedId})`,
			youtubeUrl: ytFormUrl.trim(),
			youtubeId: extractedId,
			enabled: true,
		};

		setPlaylist((prev) => [...prev, newItem]);
		setModalType(null);
		setToast({
			type: 'success',
			title: 'Video YouTube Ditambahkan!',
			message: `"${newItem.title}" siap diputar penuh saat gilirannya tiba.`,
		});
	};

	// Video Upload Handler (Uploads directly to Cloudflare R2 + saves to IndexedDB for offline capability)
	const handleSelectVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Maximum 300MB limit
		if (file.size > 300 * 1024 * 1024) {
			setToast({
				type: 'error',
				title: 'Ukuran Video Terlalu Besar',
				message: 'Ukuran file video melebihi batas maksimum 300MB.',
			});
			return;
		}

		try {
			setIsUploadingVideo(true);
			setToast({
				type: 'info',
				title: 'Mengunggah Video ke Cloudflare R2...',
				message: `Mengunggah "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) ke Cloudflare R2... Harap tunggu sebentar.`,
			});

			// 1. Upload to Cloudflare R2 via Backend API
			const uploadRes = await api.uploadMedia(file);

			// 2. Also save to local IndexedDB for immediate local playback & offline backup
			let meta: StoredVideoItem | null = null;
			try {
				meta = await saveLocalVideo(file, file.name);
			} catch {
				/* ignore local storage error if quota exceeded */
			}

			const newItem: TVPlaylistItem = {
				id: `r2_${Date.now()}`,
				type: 'local_video',
				title: file.name.replace(/\.[^/.]+$/, ''),
				videoUrl: uploadRes.url,
				localVideoId: meta?.id || `r2_${Date.now()}`,
				localVideoName: file.name,
				localVideoSize: file.size,
				enabled: true,
			};

			const updatedPlaylist = [...playlist, newItem];
			setPlaylist(updatedPlaylist);

			// Auto-sync new playlist to backend so TV immediately receives it
			api.updateTVSettings({
				playback_mode: playbackMode,
				single_mode: singleMode,
				running_text: runningText,
				office_address: officeAddress,
				playlist: updatedPlaylist,
			}).catch(() => {});

			// Persist to local storage
			try {
				localStorage.setItem('ptsp_tv_playlist', JSON.stringify(updatedPlaylist));
				window.dispatchEvent(new Event('storage'));
			} catch {}

			setToast({
				type: 'success',
				title: 'Video Berhasil Diunggah ke Cloudflare R2!',
				message: `File "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) berhasil diunggah ke Cloudflare R2! TV Layar Kantor akan otomatis memutar video ini & meng-cache secara offline.`,
			});
		} catch (err) {
			console.error('Upload video to R2 failed:', err);
			setToast({
				type: 'error',
				title: 'Gagal Mengunggah Video ke Cloudflare R2',
				message: err instanceof Error ? err.message : 'Terjadi kendala saat mengunggah video ke Cloudflare R2.',
			});
		} finally {
			setIsUploadingVideo(false);
			if (videoFileInputRef.current) {
				videoFileInputRef.current.value = '';
			}
		}
	};

	// Add Custom Slide Modal Handlers
	const openAddSlideModal = () => {
		applySlideTemplate('maklumat');
		setModalType('add_slide');
	};

	const applySlideTemplate = (template: 'maklumat' | 'istirahat' | 'wbk' | 'haji') => {
		if (template === 'maklumat') {
			setSlideFormTitle('Maklumat & Standar Pelayanan PTSP');
			setSlideFormDuration(25);
			setSlideFormBadge('Zona Integritas WBK');
			setSlideFormHeading('MAKLUMAT PELAYANAN PTSP');
			setSlideFormSubheading('Kemenag Kabupaten Barito Utara');
			setSlideFormContent(DEFAULT_MAKLUMAT);
			setSlideFormCard1Title('Standar Pelayanan');
			setSlideFormCard1Text('Bebas Biaya (Gratis 100%)');
			setSlideFormCard2Title('Komitmen Integritas');
			setSlideFormCard2Text('Tolak Gratifikasi, Suap, & Pungli');
		} else if (template === 'istirahat') {
			setSlideFormTitle('Pemberitahuan Jam Istirahat Sholat');
			setSlideFormDuration(20);
			setSlideFormBadge('Jam Istirahat Layanan');
			setSlideFormHeading('JAM ISTIRAHAT & OPERASIONAL');
			setSlideFormSubheading('Pelayanan Terpadu Satu Pintu (PTSP)');
			setSlideFormContent(
				'Pelayanan loket dialihkan sejenak untuk ibadah sholat dan istirahat petugas. Antrian yang telah diambil tetap aman dalam sistem dan akan dilanjutkan tepat waktu.',
			);
			setSlideFormCard1Title('Senin - Kamis');
			setSlideFormCard1Text('Istirahat Pukul 12.00 - 13.00 WIB');
			setSlideFormCard2Title('Jumat Berkah');
			setSlideFormCard2Text('Istirahat Pukul 11.30 - 13.00 WIB');
		} else if (template === 'wbk') {
			setSlideFormTitle('Sosialisasi Wilayah Bebas Korupsi');
			setSlideFormDuration(20);
			setSlideFormBadge('Tolak Gratifikasi');
			setSlideFormHeading('KEMENAG BEBAS DARI KORUPSI & PUNGLI');
			setSlideFormSubheading('Wujudkan Zona Integritas (ZI-WBK)');
			setSlideFormContent(
				'Seluruh ASN di lingkungan Kantor Kementerian Agama Kabupaten Barito Utara berkomitmen menolak suap, persenan, atau tanda terima kasih dalam bentuk apapun. Layanan kami murni pengabdian.',
			);
			setSlideFormCard1Title('Biaya Pelayanan');
			setSlideFormCard1Text('Rp 0,- (Semua Tanpa Biaya)');
			setSlideFormCard2Title('Pengaduan Masyarakat');
			setSlideFormCard2Text('Lapor via SMS / WhatsApp Pengaduan');
		} else if (template === 'haji') {
			setSlideFormTitle('Informasi Pendaftaran Haji & Umrah');
			setSlideFormDuration(25);
			setSlideFormBadge('Layanan Haji & Umrah');
			setSlideFormHeading('PELAYANAN PENDAFTARAN HAJI REGULER');
			setSlideFormSubheading('Seksi Penyelenggaraan Haji & Umrah (PHU)');
			setSlideFormContent(
				'Pendaftaran porsi haji dapat dilakukan di loket PTSP Seksi PHU dengan membawa bukti setoran BPIH, KTP elektronik, KK, akta lahir/buku nikah, serta pas foto terbaru.',
			);
			setSlideFormCard1Title('Waktu Pelayanan');
			setSlideFormCard1Text('Setiap Hari Kerja 08.00 - 15.00 WIB');
			setSlideFormCard2Title('Loket Pelayanan');
			setSlideFormCard2Text('Loket Khusus Seksi PHU');
		}
	};

	const handleSaveNewSlide = (e: React.FormEvent) => {
		e.preventDefault();
		const newItem: TVPlaylistItem = {
			id: `slide_${Date.now()}`,
			type: 'info',
			title: slideFormTitle.trim() || 'Slide Informasi PTSP',
			durationSeconds: Math.max(5, slideFormDuration || 20),
			slideBadge: slideFormBadge.trim() || 'Informasi PTSP',
			slideHeading: slideFormHeading.trim() || 'PEMBERITAHUAN PELAYANAN',
			slideSubheading: slideFormSubheading.trim() || 'Kemenag Barito Utara',
			slideContent: slideFormContent.trim(),
			slideCard1Title: slideFormCard1Title.trim(),
			slideCard1Text: slideFormCard1Text.trim(),
			slideCard2Title: slideFormCard2Title.trim(),
			slideCard2Text: slideFormCard2Text.trim(),
			enabled: true,
		};

		setPlaylist((prev) => [...prev, newItem]);
		setModalType(null);
		setToast({
			type: 'success',
			title: 'Slide Informasi Ditambahkan!',
			message: `"${newItem.title}" berhasil ditambahkan dengan durasi ${newItem.durationSeconds} detik.`,
		});
	};

	// Edit Item Handlers
	const openEditModal = (item: TVPlaylistItem) => {
		setEditingItem(item);
		if (item.type === 'youtube') {
			setYtFormTitle(item.title);
			setYtFormUrl(item.youtubeUrl || item.youtubeId || '');
		} else if (item.type === 'info') {
			setSlideFormTitle(item.title);
			setSlideFormDuration(item.durationSeconds || 20);
			setSlideFormBadge(item.slideBadge || '');
			setSlideFormHeading(item.slideHeading || '');
			setSlideFormSubheading(item.slideSubheading || '');
			setSlideFormContent(item.slideContent || '');
			setSlideFormCard1Title(item.slideCard1Title || '');
			setSlideFormCard1Text(item.slideCard1Text || '');
			setSlideFormCard2Title(item.slideCard2Title || '');
			setSlideFormCard2Text(item.slideCard2Text || '');
		}
		setModalType('edit');
	};

	const handleSaveEdit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingItem) return;

		let updated: TVPlaylistItem = { ...editingItem };

		if (editingItem.type === 'youtube') {
			const extractedId = extractYouTubeId(ytFormUrl);
			if (!extractedId) {
				setToast({
					type: 'error',
					title: 'Tautan YouTube Tidak Valid',
					message: 'Mohon masukkan link YouTube atau ID 11 karakter yang benar.',
				});
				return;
			}
			updated = {
				...updated,
				title: ytFormTitle.trim() || updated.title,
				youtubeUrl: ytFormUrl.trim(),
				youtubeId: extractedId,
			};
		} else if (editingItem.type === 'info') {
			updated = {
				...updated,
				title: slideFormTitle.trim() || updated.title,
				durationSeconds: Math.max(5, slideFormDuration || 20),
				slideBadge: slideFormBadge.trim(),
				slideHeading: slideFormHeading.trim(),
				slideSubheading: slideFormSubheading.trim(),
				slideContent: slideFormContent.trim(),
				slideCard1Title: slideFormCard1Title.trim(),
				slideCard1Text: slideFormCard1Text.trim(),
				slideCard2Title: slideFormCard2Title.trim(),
				slideCard2Text: slideFormCard2Text.trim(),
			};
		} else if (editingItem.type === 'local_video') {
			updated = {
				...updated,
				title: ytFormTitle.trim() || updated.title,
			};
		}

		setPlaylist((prev) => prev.map((p) => (p.id === editingItem.id ? updated : p)));
		setEditingItem(null);
		setModalType(null);
		setToast({
			type: 'success',
			title: 'Perubahan Konten Disimpan!',
			message: `"${updated.title}" telah diperbarui.`,
		});
	};

	// Audio Test Handlers
	const handleTestChime = () => {
		playBankChime(chimeTone);
		setToast({
			type: 'info',
			title: 'Uji Nada Bel Dibunyikan',
			message: `Memutar nada bel ${
				chimeTone === 'bank'
					? 'Bank Teller 3-Tone'
					: chimeTone === 'airport'
					? 'Bandara Internasional 4-Tone'
					: 'Modern Digital 2-Tone'
			}.`,
		});
	};

	const handleTestFullCall = () => {
		announceQueue(
			{
				id: 'test',
				category_id: '1',
				category_code: 'A',
				category_name: 'Seksi Bimas Islam',
				ticket_number: 7,
				status: 'called',
				source: 'admin',
				called_at: new Date().toISOString(),
				completed_at: null,
				created_at: new Date().toISOString(),
			},
			true,
			chimeTone,
			parseFloat(voiceRate) || 0.9,
		);
		setToast({
			type: 'info',
			title: 'Uji Panggilan Berjalan',
			message: 'Memutar bel dan suara: "Nomor Antrian A 0 0 7, menuju Loket 1".',
		});
	};

	return (
		<div className="w-full space-y-6">
			{/* Floating Toaster Notification */}
			{toast && <Toast toast={toast} onClose={() => setToast(null)} />}

			{/* Hidden Multi-Video File Input */}
			<input
				ref={videoFileInputRef}
				type="file"
				accept="video/mp4,video/webm,video/quicktime"
				className="hidden"
				onChange={handleSelectVideoFile}
			/>

			{/* Header Card */}
			<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
							<TvIcon className="h-6 w-6 text-emerald-600" />
						</div>
						<div>
							<h3 className="text-lg font-black text-slate-900 tracking-tight">
								Pengaturan Layar TV Monitor (PTSP)
							</h3>
							<p className="text-xs text-slate-500">
								Atur susunan tayangan bergantian (YouTube, Video Lokal, Slide Informasi), teks pengumuman, dan audio teller.
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
							<span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
							Realtime Sync Aktif
						</span>
					</div>
				</div>
			</div>

			<form onSubmit={handleSave} className="space-y-8">
				{/* 1. Pengaturan Tema Tampilan Layar TV */}
				<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h4 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
								1. Tema Tampilan Layar TV Monitor (Light / Dark)
							</h4>
							<p className="text-xs text-slate-500 mt-0.5">
								Pilih mode tampilan layar TV. Perubahan langsung tersinkronisasi ke seluruh layar monitor secara real-time.
							</p>
						</div>
						<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 shrink-0 w-fit">
							{theme === 'light' ? 'Mode Terang Aktif' : 'Mode Gelap Aktif'}
						</span>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Mode Light (Putih Bersih) */}
						<label
							className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
								theme === 'light'
									? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 shadow-xs'
									: 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70 text-slate-700'
							}`}
						>
							<input
								type="radio"
								name="tvTheme"
								value="light"
								checked={theme === 'light'}
								onChange={() => setTheme('light')}
								className="accent-emerald-600 h-5 w-5 mt-0.5 shrink-0"
							/>
							<div>
								<div className="flex items-center gap-2">
									<p className="text-sm font-black text-slate-900">
										Tema Terang (Clean Light White)
									</p>
									<span className="rounded bg-emerald-700 px-2 py-0.5 text-[10px] font-extrabold text-white">
										STANDAR LOBI
									</span>
								</div>
								<p className="text-xs text-slate-500 mt-1 leading-relaxed">
									Latar belakang putih bersih dan abu-abu cerah dengan tulisan hitam pekat beraksen hijau Kemenag. Terang, elegan, dan sangat mudah dibaca dari jarak jauh di lobi pelayanan.
								</p>
							</div>
						</label>

						{/* Mode Dark (Gelap Sinematik) */}
						<label
							className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
								theme === 'dark'
									? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 shadow-xs'
									: 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70 text-slate-700'
							}`}
						>
							<input
								type="radio"
								name="tvTheme"
								value="dark"
								checked={theme === 'dark'}
								onChange={() => setTheme('dark')}
								className="accent-emerald-600 h-5 w-5 mt-0.5 shrink-0"
							/>
							<div>
								<p className="text-sm font-black text-slate-900">
									Tema Gelap (Cinematic Dark Mode)
								</p>
								<p className="text-xs text-slate-500 mt-1 leading-relaxed">
									Latar belakang gelap sinematik dengan aksen emas dan hijau menyala. Cocok untuk ruangan dengan pencahayaan redup.
								</p>
							</div>
						</label>
					</div>
				</div>

				{/* 2. Pemilihan Metode Penayangan */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
							2. Metode Penayangan Media (Layar Kiri TV)
						</label>
						<span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
							{playbackMode === 'playlist' ? 'Mode Bergantian Aktif' : 'Mode Tunggal Aktif'}
						</span>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Mode Playlist (Looping Carousel) */}
						<label
							className={`flex flex-col justify-between p-5 rounded-2xl border cursor-pointer transition-all ${
								playbackMode === 'playlist'
									? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 shadow-xs'
									: 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70 text-slate-700'
							}`}
						>
							<div className="flex items-start gap-3.5">
								<input
									type="radio"
									name="playbackMode"
									value="playlist"
									checked={playbackMode === 'playlist'}
									onChange={() => setPlaybackMode('playlist')}
									className="accent-emerald-600 h-5 w-5 mt-0.5 shrink-0"
								/>
								<div>
									<div className="flex items-center gap-2">
										<p className="text-sm font-black text-slate-900">
											Mode Bergantian / Playlist Berulang (Looping)
										</p>
										<span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
											STANDAR GRAPARI
										</span>
									</div>
									<p className="text-xs text-slate-500 mt-1 leading-relaxed">
										Tayangan berputar otomatis secara bergantian tanpa henti. Anda bebas menambahkan banyak video YouTube, video lokal MP4, maupun slide teks pengumuman. Video berputar penuh hingga selesai sebelum berganti.
									</p>
								</div>
							</div>
						</label>

						{/* Mode Single (Statis) */}
						<label
							className={`flex flex-col justify-between p-5 rounded-2xl border cursor-pointer transition-all ${
								playbackMode === 'single'
									? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 shadow-xs'
									: 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70 text-slate-700'
							}`}
						>
							<div className="flex items-start gap-3.5">
								<input
									type="radio"
									name="playbackMode"
									value="single"
									checked={playbackMode === 'single'}
									onChange={() => setPlaybackMode('single')}
									className="accent-emerald-600 h-5 w-5 mt-0.5 shrink-0"
								/>
								<div>
									<p className="text-sm font-black text-slate-900">
										Mode Tunggal / Statis (1 Tayangan Saja)
									</p>
									<p className="text-xs text-slate-500 mt-1 leading-relaxed">
										Hanya menampilkan 1 jenis media secara terus-menerus tanpa bergantian ke media lain.
									</p>
								</div>
							</div>
						</label>
					</div>
				</div>

				{/* 2. Susunan Urutan Playlist & Multi-Item Builder */}
				{playbackMode === 'playlist' ? (
					<div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:p-6 space-y-4">
						{/* Action Buttons: Add YouTube, Upload Local, Add Slide */}
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
							<div>
								<h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
									<ArrowPathIcon className="h-5 w-5 text-emerald-600" />
									Susunan Urutan Tayangan Playlist
								</h4>
								<p className="text-xs text-slate-500 mt-0.5">
									Susun urutan tayangan, ubah durasi slide, dan tambahkan konten media baru ke daftar putar TV monitor.
								</p>
							</div>

							{/* Add Buttons Group */}
							<div className="flex items-center gap-2 flex-wrap">
								<button
									type="button"
									onClick={openAddYoutubeModal}
									className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition-colors"
								>
									<PlusIcon className="h-4 w-4" />
									+ Video YouTube
								</button>

								<button
									type="button"
									disabled={isUploadingVideo}
									onClick={() => videoFileInputRef.current?.click()}
									className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-700 transition-colors disabled:opacity-50"
								>
									<PlusIcon className="h-4 w-4" />
									{isUploadingVideo ? 'Mengunggah ke Cloudflare R2...' : '+ Upload MP4 (Cloudflare R2)'}
								</button>

								<button
									type="button"
									onClick={openAddSlideModal}
									className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-colors"
								>
									<PlusIcon className="h-4 w-4" />
									+ Slide Info / Istirahat
								</button>
							</div>
						</div>

						{/* Playlist Cards List */}
						<div className="space-y-2.5">
							{playlist.map((item, index) => {
								const isFirst = index === 0;
								const isLast = index === playlist.length - 1;

								const typeStyle = {
									info: {
										border: 'border-emerald-200/80',
										badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
										icon: '📑',
										typeLabel: 'Slide Informasi',
										dot: 'bg-emerald-500',
									},
									youtube: {
										border: 'border-red-200/80',
										badgeBg: 'bg-red-50 text-red-700 border-red-200',
										icon: '▶️',
										typeLabel: 'YouTube Video',
										dot: 'bg-red-500',
									},
									local_video: {
										border: 'border-sky-200/80',
										badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
										icon: '☁️',
										typeLabel: 'Video R2 Cloud',
										dot: 'bg-sky-500',
									},
								}[item.type];

								return (
									<div
										key={item.id}
										className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all ${
											item.enabled
												? 'border-slate-200/90 bg-white shadow-2xs hover:border-slate-300'
												: 'border-slate-200/50 bg-slate-50/70 opacity-60'
										}`}
									>
										{/* Left: Sequence Number, Icon & Clean Details */}
										<div className="flex items-center gap-3 min-w-0 flex-1">
											<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white font-black text-[11px] shadow-2xs">
												#{index + 1}
											</span>

											<div className="min-w-0 flex-1">
												<p className="text-sm font-bold text-slate-800 truncate" title={item.title}>
													{item.title}
												</p>

												<div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
													<span
														className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${typeStyle.badgeBg}`}
													>
														<span>{typeStyle.icon}</span>
														<span>{typeStyle.typeLabel}</span>
													</span>

													{item.type === 'local_video' && item.localVideoSize && (
														<span className="text-[11px] font-medium text-slate-400">
															{(item.localVideoSize / (1024 * 1024)).toFixed(1)} MB
														</span>
													)}

													{item.type === 'info' && item.slideBadge && (
														<span className="text-[11px] font-medium text-slate-400 truncate">
															• {item.slideBadge}
														</span>
													)}
												</div>
											</div>
										</div>

										{/* Right: Duration, Status Switch & Actions */}
										<div className="flex items-center gap-2.5 shrink-0 justify-end">
											{/* Duration: Slide gets input, Video gets automatic badge */}
											{item.type === 'info' ? (
												<div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 text-xs">
													<ClockIcon className="h-3.5 w-3.5 text-slate-400" />
													<span className="text-slate-500 font-medium">Durasi:</span>
													<input
														type="number"
														min={5}
														max={600}
														value={item.durationSeconds || 20}
														onChange={(e) =>
															updateItemDuration(index, parseInt(e.target.value) || 20)
														}
														className="w-12 bg-white border border-slate-200 rounded px-1 py-0.5 text-xs font-bold text-slate-900 text-center focus:outline-none focus:border-emerald-600"
													/>
													<span className="text-slate-400 font-medium">dtk</span>
												</div>
											) : (
												<span className="inline-flex items-center gap-1 rounded-lg bg-slate-100/90 border border-slate-200/70 px-2.5 py-1 text-xs font-semibold text-slate-600">
													⏱️ Putar Penuh
												</span>
											)}

											{/* Toggle Enabled Switch */}
											<button
												type="button"
												onClick={() => toggleItemEnabled(index)}
												className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
													item.enabled
														? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/70'
														: 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
												}`}
											>
												<span
													className={`w-1.5 h-1.5 rounded-full ${
														item.enabled ? 'bg-emerald-500' : 'bg-slate-400'
													}`}
												/>
												<span>{item.enabled ? 'Aktif' : 'Mati'}</span>
											</button>

											{/* Edit Item Content */}
											<button
												type="button"
												onClick={() => openEditModal(item)}
												title="Edit Konten Item Ini"
												className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
											>
												<PencilIcon className="h-3.5 w-3.5" />
											</button>

											{/* Order Up / Down Buttons */}
											<div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5">
												<button
													type="button"
													disabled={isFirst}
													onClick={() => moveItem(index, 'up')}
													title="Geser ke Atas"
													className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-25 disabled:cursor-not-allowed text-[11px] font-bold"
												>
													▲
												</button>
												<button
													type="button"
													disabled={isLast}
													onClick={() => moveItem(index, 'down')}
													title="Geser ke Bawah"
													className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-25 disabled:cursor-not-allowed text-[11px] font-bold"
												>
													▼
												</button>
											</div>

											{/* Delete Item Button */}
											<button
												type="button"
												onClick={() => handleDeleteItem(index)}
												title="Hapus dari Playlist"
												className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200/80 bg-rose-50/80 text-rose-600 hover:bg-rose-100 hover:text-rose-800 transition-colors"
											>
												<TrashIcon className="h-3.5 w-3.5" />
											</button>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				) : (
					/* Mode Tunggal (Single Media Selection) */
					<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
						<label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
							Pilih 1 Konten Media yang Ingin Ditampilkan Terus Menerus:
						</label>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<button
								type="button"
								onClick={() => setSingleMode('info')}
								className={`p-4 rounded-xl border text-left font-bold text-sm transition-all ${
									singleMode === 'info'
										? 'border-emerald-600 bg-white ring-2 ring-emerald-600/20 text-emerald-900'
										: 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white'
								}`}
							>
								📑 Slide Maklumat Pelayanan
							</button>

							<button
								type="button"
								onClick={() => setSingleMode('youtube')}
								className={`p-4 rounded-xl border text-left font-bold text-sm transition-all ${
									singleMode === 'youtube'
										? 'border-emerald-600 bg-white ring-2 ring-emerald-600/20 text-emerald-900'
										: 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white'
								}`}
							>
								▶ Video YouTube
							</button>

							<button
								type="button"
								onClick={() => setSingleMode('local_video')}
								className={`p-4 rounded-xl border text-left font-bold text-sm transition-all ${
									singleMode === 'local_video'
										? 'border-emerald-600 bg-white ring-2 ring-emerald-600/20 text-emerald-900'
										: 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white'
								}`}
							>
								📁 Video File Lokal (Offline)
							</button>
						</div>
					</div>
				)}

				{/* 3. Teks Berjalan Pengumuman (Marquee Bawah TV) */}
				<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
					<div className="flex items-center justify-between">
						<label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
							3. Teks Berjalan Pengumuman (Running Text Bawah TV)
						</label>
						<button
							type="button"
							onClick={() => setRunningText(DEFAULT_RUNNING_TEXT)}
							className="text-xs font-bold text-emerald-700 hover:underline"
						>
							Reset ke Teks Standar
						</button>
					</div>
					<textarea
						rows={3}
						value={runningText}
						onChange={(e) => setRunningText(e.target.value)}
						className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 leading-relaxed font-sans"
						placeholder="Tuliskan teks pengumuman yang akan berjalan di bagian bawah TV..."
					/>
					<p className="text-[11px] text-slate-400">
						Gunakan tanda pemisah bullet ( • ) untuk memisahkan antar segmen pengumuman.
					</p>
				</div>

				{/* 4. Konfigurasi Audio Nada Bel Teller & Suara AI */}
				<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
					<div className="flex items-center justify-between">
						<h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
							<BellIcon className="h-5 w-5 text-amber-500" />
							4. Konfigurasi Nada Bel & Suara Pemanggil Antrian
						</h4>
						<span className="text-xs text-slate-400">Web Audio API Synthesizer</span>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Pilihan Nada Bel */}
						<div>
							<label className="block text-xs font-bold text-slate-700 mb-1.5">
								Pilihan Nada Bel (Chime Tone)
							</label>
							<ModernSelect
								value={chimeTone}
								onChange={(val) => setChimeTone(val as ChimeTone)}
								options={[
									{ value: 'bank', label: 'Bank Teller (3-Tone Clavier)' },
									{ value: 'airport', label: 'Bandara Internasional (4-Tone Ding-Dong)' },
									{ value: 'modern', label: 'Modern Digital (2-Tone Ascending)' },
								]}
							/>
						</div>

						{/* Kecepatan Suara */}
						<div>
							<label className="block text-xs font-bold text-slate-700 mb-1.5">
								Kecepatan Suara Panggilan (TTS Voice Rate)
							</label>
							<ModernSelect
								value={voiceRate}
								onChange={(val) => setVoiceRate(val)}
								options={[
									{ value: '0.8', label: 'Perlahan & Sangat Jelas (0.8x)' },
									{ value: '0.9', label: 'Optimal Standar Loket (0.9x)' },
									{ value: '1.0', label: 'Normal Alami (1.0x)' },
								]}
							/>
						</div>
					</div>

					{/* Tombol Uji Suara */}
					<div className="flex items-center gap-3 pt-2">
						<button
							type="button"
							onClick={handleTestChime}
							className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
						>
							<BellIcon className="h-4 w-4 text-amber-500" />
							Uji Nada Bel Saja
						</button>
						<button
							type="button"
							onClick={handleTestFullCall}
							className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
						>
							<ArrowPathIcon className="h-4 w-4 text-emerald-600" />
							Uji Panggilan Lengkap (Bel + Suara)
						</button>
					</div>
				</div>

				{/* Tombol Simpan & Terapkan Pengaturan */}
				<div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
					<button
						type="submit"
						disabled={isSaving}
						className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-md hover:bg-emerald-700 transition-all hover:shadow-lg disabled:opacity-50"
					>
						{isSaving ? (
							<>
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
								<span>Menyimpan...</span>
							</>
						) : (
							<>
								<CheckCircleIcon className="h-5 w-5" />
								<span>Simpan & Terapkan Pengaturan TV</span>
							</>
						)}
					</button>
				</div>
			</form>

			{/* ================= MODAL TAMBAH VIDEO YOUTUBE ================= */}
			{modalType === 'add_youtube' && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
					<div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<h4 className="text-base font-black text-slate-900 flex items-center gap-2">
								<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-600 font-bold text-xs">
									▶
								</span>
								Tambah Video YouTube ke Playlist
							</h4>
							<button
								type="button"
								onClick={() => setModalType(null)}
								className="text-slate-400 hover:text-slate-700 p-1"
							>
								<XMarkIcon className="h-5 w-5" />
							</button>
						</div>

						<form onSubmit={handleSaveNewYoutube} className="space-y-4">
							<div>
								<label className="block text-xs font-bold text-slate-700 mb-1">
									Judul Video (Untuk Tampilan Layar)
								</label>
								<input
									type="text"
									required
									value={ytFormTitle}
									onChange={(e) => setYtFormTitle(e.target.value)}
									placeholder="Contoh: Video Profil Kantor Kemenag Barito Utara"
									className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none font-sans"
								/>
							</div>

							<div>
								<label className="block text-xs font-bold text-slate-700 mb-1">
									Tautan Link atau ID YouTube
								</label>
								<input
									type="text"
									required
									value={ytFormUrl}
									onChange={(e) => setYtFormUrl(e.target.value)}
									placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
									className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none font-sans"
								/>
								<p className="text-[11px] text-slate-400 mt-1">
									ID Terdeteksi: <span className="font-mono text-emerald-700 font-bold">{extractYouTubeId(ytFormUrl) || '-'}</span>
								</p>
							</div>

							{/* Video Live Preview */}
							{extractYouTubeId(ytFormUrl) && (
								<div className="rounded-xl overflow-hidden border border-slate-200 aspect-video bg-black shadow-inner">
									<img
										src={`https://img.youtube.com/vi/${extractYouTubeId(ytFormUrl)}/hqdefault.jpg`}
										alt="Preview"
										className="w-full h-full object-cover"
									/>
								</div>
							)}

							<div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setModalType(null)}
									className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
								>
									Batal
								</button>
								<button
									type="submit"
									className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs"
								>
									Tambahkan ke Playlist
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* ================= MODAL TAMBAH / EDIT SLIDE INFORMASI ================= */}
			{(modalType === 'add_slide' || (modalType === 'edit' && editingItem?.type === 'info')) && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
					<div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<h4 className="text-base font-black text-slate-900 flex items-center gap-2">
								<ShieldCheckIcon className="h-5 w-5 text-emerald-600" />
								{modalType === 'edit' ? 'Edit Slide Informasi' : 'Buat Slide Informasi Baru'}
							</h4>
							<button
								type="button"
								onClick={() => setModalType(null)}
								className="text-slate-400 hover:text-slate-700 p-1"
							>
								<XMarkIcon className="h-5 w-5" />
							</button>
						</div>

						{/* Quick Templates */}
						{modalType !== 'edit' && (
							<div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
								<span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
									Pilih Template Cepat:
								</span>
								<div className="flex items-center gap-1.5 flex-wrap">
									<button
										type="button"
										onClick={() => applySlideTemplate('maklumat')}
										className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300"
									>
										📑 Maklumat Pelayanan
									</button>
									<button
										type="button"
										onClick={() => applySlideTemplate('istirahat')}
										className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-50 hover:border-amber-300"
									>
										🕌 Jam Istirahat Sholat
									</button>
									<button
										type="button"
										onClick={() => applySlideTemplate('wbk')}
										className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-blue-800 hover:bg-blue-50 hover:border-blue-300"
									>
										🚫 Tolak Gratifikasi & Suap
									</button>
									<button
										type="button"
										onClick={() => applySlideTemplate('haji')}
										className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-purple-800 hover:bg-purple-50 hover:border-purple-300"
									>
										🕋 Info Pendaftaran Haji
									</button>
								</div>
							</div>
						)}

						<form
							onSubmit={modalType === 'edit' ? handleSaveEdit : handleSaveNewSlide}
							className="space-y-3"
						>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
								<div className="sm:col-span-2">
									<label className="block text-xs font-bold text-slate-700 mb-1">
										Judul Slide (Daftar Putar)
									</label>
									<input
										type="text"
										required
										value={slideFormTitle}
										onChange={(e) => setSlideFormTitle(e.target.value)}
										className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
									/>
								</div>
								<div>
									<label className="block text-xs font-bold text-slate-700 mb-1">
										Durasi Tayang (Detik)
									</label>
									<input
										type="number"
										min={5}
										max={600}
										required
										value={slideFormDuration}
										onChange={(e) => setSlideFormDuration(parseInt(e.target.value) || 20)}
										className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none text-center font-bold"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div>
									<label className="block text-xs font-bold text-slate-700 mb-1">
										Badge Sudut Kanan Atas
									</label>
									<input
										type="text"
										value={slideFormBadge}
										onChange={(e) => setSlideFormBadge(e.target.value)}
										placeholder="Misal: Zona Integritas WBK / Jam Istirahat"
										className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
									/>
								</div>
								<div>
									<label className="block text-xs font-bold text-slate-700 mb-1">
										Sub-Judul Instansi
									</label>
									<input
										type="text"
										value={slideFormSubheading}
										onChange={(e) => setSlideFormSubheading(e.target.value)}
										placeholder="Kemenag Kabupaten Barito Utara"
										className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
									/>
								</div>
							</div>

							<div>
								<label className="block text-xs font-bold text-slate-700 mb-1">
									Judul Besar Slide (Heading Utama)
								</label>
								<input
									type="text"
									value={slideFormHeading}
									onChange={(e) => setSlideFormHeading(e.target.value)}
									placeholder="MAKLUMAT PELAYANAN PTSP"
									className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
								/>
							</div>

							<div>
								<label className="block text-xs font-bold text-slate-700 mb-1">
									Isi Teks Pernyataan / Pengumuman
								</label>
								<textarea
									rows={3}
									value={slideFormContent}
									onChange={(e) => setSlideFormContent(e.target.value)}
									placeholder="Tuliskan pernyataan atau pengumuman lengkap..."
									className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none leading-relaxed"
								/>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
								<div className="space-y-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50">
									<label className="block text-[11px] font-bold text-slate-600 uppercase">
										Kotak Info Kiri (Point 1)
									</label>
									<input
										type="text"
										placeholder="Judul (misal: Standar Layanan)"
										value={slideFormCard1Title}
										onChange={(e) => setSlideFormCard1Title(e.target.value)}
										className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
									/>
									<input
										type="text"
										placeholder="Keterangan (misal: Bebas Biaya 100%)"
										value={slideFormCard1Text}
										onChange={(e) => setSlideFormCard1Text(e.target.value)}
										className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
									/>
								</div>

								<div className="space-y-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50">
									<label className="block text-[11px] font-bold text-slate-600 uppercase">
										Kotak Info Kanan (Point 2)
									</label>
									<input
										type="text"
										placeholder="Judul (misal: Komitmen Integritas)"
										value={slideFormCard2Title}
										onChange={(e) => setSlideFormCard2Title(e.target.value)}
										className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
									/>
									<input
										type="text"
										placeholder="Keterangan (misal: Tolak Gratifikasi)"
										value={slideFormCard2Text}
										onChange={(e) => setSlideFormCard2Text(e.target.value)}
										className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
									/>
								</div>
							</div>

							<div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setModalType(null)}
									className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
								>
									Batal
								</button>
								<button
									type="submit"
									className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
								>
									{modalType === 'edit' ? 'Simpan Perubahan Slide' : 'Tambahkan ke Playlist'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* ================= MODAL EDIT VIDEO YOUTUBE ================= */}
			{modalType === 'edit' && editingItem?.type === 'youtube' && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
					<div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<h4 className="text-base font-black text-slate-900">
								Edit Konten Video YouTube
							</h4>
							<button
								type="button"
								onClick={() => setModalType(null)}
								className="text-slate-400 hover:text-slate-700 p-1"
							>
								<XMarkIcon className="h-5 w-5" />
							</button>
						</div>

						<form onSubmit={handleSaveEdit} className="space-y-4">
							<div>
								<label className="block text-xs font-bold text-slate-700 mb-1">
									Judul Video
								</label>
								<input
									type="text"
									required
									value={ytFormTitle}
									onChange={(e) => setYtFormTitle(e.target.value)}
									className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
								/>
							</div>

							<div>
								<label className="block text-xs font-bold text-slate-700 mb-1">
									Tautan Link atau ID YouTube
								</label>
								<input
									type="text"
									required
									value={ytFormUrl}
									onChange={(e) => setYtFormUrl(e.target.value)}
									className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-red-600 focus:outline-none"
								/>
								<p className="text-[11px] text-slate-400 mt-1">
									ID Terdeteksi: <span className="font-mono text-emerald-700 font-bold">{extractYouTubeId(ytFormUrl) || '-'}</span>
								</p>
							</div>

							<div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setModalType(null)}
									className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
								>
									Batal
								</button>
								<button
									type="submit"
									className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs"
								>
									Simpan Perubahan
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Custom Confirmation Modal for Deleting Playlist Item */}
			<ConfirmModal
				isOpen={Boolean(deleteConfirmItem)}
				title="Hapus Tayangan dari Playlist?"
				message={
					deleteConfirmItem ? (
						<span>
							Apakah Anda yakin ingin menghapus tayangan{' '}
							<strong className="text-slate-900 font-bold">"{deleteConfirmItem.item.title}"</strong>{' '}
							dari daftar putar TV? Tayangan ini tidak akan diputar lagi di layar monitor kantor.
						</span>
					) : null
				}
				confirmText="Ya, Hapus Tayangan"
				cancelText="Batal"
				variant="danger"
				onConfirm={handleConfirmDelete}
				onClose={() => setDeleteConfirmItem(null)}
			/>
		</div>
	);
}
