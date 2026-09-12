export interface User {
	id: string;
	username: string;
	name: string;
	role: string;
	created_at?: string;
	updated_at?: string;
}

export interface Category {
	id: string;
	code: string;
	name: string;
	description: string;
	display_order: number;
	is_active: boolean;
}

export interface Queue {
	id: string;
	category_id: string;
	ticket_number: number;
	status: 'waiting' | 'called' | 'completed' | 'skipped';
	source: 'kiosk' | 'admin';
	called_at: string | null;
	completed_at: string | null;
	created_at: string;
	category_code: string;
	category_name: string;
}

export interface Ticket {
	id: string;
	category_code: string;
	category_name: string;
	ticket_number: number;
	status: string;
	queue_ahead: number;
	created_at: string;
}

export interface Stats {
	total_today: number;
	waiting: number;
	called: number;
	completed: number;
	avg_wait_min: number;
	next_number: number;
	open: boolean;
	is_operational: boolean;
}

export interface LoginResponse {
	token: string;
	user: User;
}

export interface WSMessage<T = unknown> {
	type:
		| 'queue_created'
		| 'queue_called'
		| 'queue_recalled'
		| 'queue_completed'
		| 'queue_skipped'
		| 'stats'
		| 'tv_settings_updated'
		| 'categories_updated'
		| (string & {});
	data: T;
}

export type MediaItemType = 'info' | 'youtube' | 'local_video';

export interface TVPlaylistItem {
	id: string;
	type: MediaItemType;
	title: string;
	enabled: boolean;

	// Duration (detik) - Khusus tipe 'info' (slide)
	durationSeconds?: number;

	// Khusus Slide Teks/Informasi ('info')
	slideBadge?: string;      // misal: "Zona Integritas WBK", "Jam Istirahat Layanan", "Pengumuman"
	slideHeading?: string;    // Judul besar slide
	slideSubheading?: string; // Sub judul
	slideContent?: string;    // Isi teks utama / maklumat / pengumuman
	slideCard1Title?: string; // Kotak info kiri/atas
	slideCard1Text?: string;
	slideCard2Title?: string; // Kotak info kanan/bawah
	slideCard2Text?: string;

	// Khusus Video YouTube ('youtube')
	youtubeUrl?: string;
	youtubeId?: string;

	// Khusus Video MP4 / Cloudflare R2 / Lokal ('local_video')
	videoUrl?: string;        // URL publik Cloudflare R2 (https://pub-xxx.r2.dev/...)
	localVideoId?: string;    // ID referensi penyimpanan di IndexedDB
	localVideoName?: string;  // Nama file asli
	localVideoSize?: number;  // Ukuran file dalam bytes
}

export interface TVSettings {
	id: string;
	playback_mode: 'playlist' | 'single';
	single_mode: 'youtube' | 'local_video' | 'info' | 'video';
	video_id: string;
	running_text: string;
	custom_maklumat: string;
	office_address: string;
	playlist: TVPlaylistItem[];
	theme?: 'light' | 'dark';
	updated_at?: string;
}

export const DEFAULT_PLAYLIST: TVPlaylistItem[] = [
	{
		id: 'item_maklumat',
		type: 'info',
		title: 'Maklumat & Standar Pelayanan PTSP',
		durationSeconds: 25,
		enabled: true,
		slideBadge: 'Zona Integritas WBK',
		slideHeading: 'MAKLUMAT PELAYANAN PTSP',
		slideSubheading: 'Kemenag Kabupaten Barito Utara',
		slideContent:
			'“Dengan ini kami menyatakan sanggup menyelenggarakan pelayanan sesuai standar pelayanan yang telah ditetapkan dan apabila tidak menepati janji ini, kami siap menerima sanksi sesuai peraturan perundang-undangan yang berlaku.”',
		slideCard1Title: 'Standar Pelayanan',
		slideCard1Text: 'Bebas Biaya (Gratis 100%) Tanpa Pungli',
		slideCard2Title: 'Komitmen Integritas',
		slideCard2Text: 'Tolak Gratifikasi, Suap, & Pelayanan Cepat Transparan',
	},
	{
		id: 'item_youtube_default',
		type: 'youtube',
		title: 'Video Sosialisasi / YouTube Kemenag',
		enabled: true,
		youtubeId: 'kYJ4-n2V1qM',
		youtubeUrl: 'https://www.youtube.com/watch?v=kYJ4-n2V1qM',
	},
	{
		id: 'item_istirahat',
		type: 'info',
		title: 'Informasi Jam Istirahat & Layanan',
		durationSeconds: 15,
		enabled: false,
		slideBadge: 'Informasi Jam Layanan',
		slideHeading: 'JAM ISTIRAHAT & OPERASIONAL',
		slideSubheading: 'Pelayanan Terpadu Satu Pintu (PTSP)',
		slideContent:
			'Pelayanan loket tatap muka dialihkan sejenak pada jam istirahat untuk ibadah sholat dan istirahat petugas. Antrian tetap tersimpan dalam sistem dan akan dilanjutkan kembali tepat waktu.',
		slideCard1Title: 'Senin - Kamis',
		slideCard1Text: 'Istirahat Pukul 12.00 - 13.00 WIB',
		slideCard2Title: 'Jumat Berkah',
		slideCard2Text: 'Istirahat Pukul 11.30 - 13.00 WIB',
	},
];