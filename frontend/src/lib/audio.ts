import type { Queue } from './types';

export type ChimeTone = 'bank' | 'airport' | 'modern';

/**
 * Web Audio API Synthesizer with selectable chimes
 */
export function playBankChime(tone: ChimeTone = 'bank'): void {
	try {
		const AudioContextClass =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		if (!AudioContextClass) return;

		const ctx = new AudioContextClass();
		if (ctx.state === 'suspended') {
			ctx.resume();
		}

		let notes: { freq: number; start: number; duration: number }[];

		if (tone === 'airport') {
			// Airport / Train 4-Tone Chime: A4 (440Hz) -> F4 (349Hz) -> D4 (293Hz) -> A3 (220Hz)
			notes = [
				{ freq: 440.0, start: 0, duration: 0.35 },
				{ freq: 349.23, start: 0.28, duration: 0.35 },
				{ freq: 293.66, start: 0.56, duration: 0.35 },
				{ freq: 220.0, start: 0.84, duration: 0.65 },
			];
		} else if (tone === 'modern') {
			// Modern Digital Chime: C5 (523Hz) -> G5 (783Hz)
			notes = [
				{ freq: 523.25, start: 0, duration: 0.25 },
				{ freq: 783.99, start: 0.2, duration: 0.6 },
			];
		} else {
			// Default Bank Teller 3-Tone: F4 (349Hz) -> A4 (440Hz) -> C5 (523Hz)
			notes = [
				{ freq: 349.23, start: 0, duration: 0.32 },
				{ freq: 440.0, start: 0.26, duration: 0.38 },
				{ freq: 523.25, start: 0.54, duration: 0.75 },
			];
		}

		notes.forEach(({ freq, start, duration }) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = 'sine';
			osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

			gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
			gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + start + 0.03);
			gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(ctx.currentTime + start);
			osc.stop(ctx.currentTime + start + duration);
		});
	} catch (e) {
		console.warn('Audio chime unsupported or blocked:', e);
	}
}

const DIGIT_WORDS: Record<string, string> = {
	'0': 'kosong',
	'1': 'satu',
	'2': 'dua',
	'3': 'tiga',
	'4': 'empat',
	'5': 'lima',
	'6': 'enam',
	'7': 'tujuh',
	'8': 'delapan',
	'9': 'sembilan',
};

/**
 * Text-to-Speech Engine with Indonesian pronunciation and spelled-out digits
 */
export function announceQueue(
	queue: Queue,
	audioEnabled: boolean,
	chimeTone?: ChimeTone,
	voiceRate?: number,
): void {
	if (!audioEnabled) return;

	let tone: ChimeTone = chimeTone || 'bank';
	try {
		const saved = localStorage.getItem('ptsp_tv_chime_tone') as ChimeTone;
		if (saved) tone = saved;
	} catch {
		/* ignore */
	}

	let rate = voiceRate || 0.9;
	try {
		const savedRate = localStorage.getItem('ptsp_tv_voice_rate');
		if (savedRate) rate = parseFloat(savedRate);
	} catch {
		/* ignore */
	}

	playBankChime(tone);

	if (!('speechSynthesis' in window)) return;
	window.speechSynthesis.cancel();

	const delay = tone === 'airport' ? 1500 : 1100;

	setTimeout(() => {
		const digits = String(queue.ticket_number).padStart(3, '0').split('');
		const spelled = digits.map((d) => DIGIT_WORDS[d] || d).join(' ');

		const text = `Nomor antrian, ${queue.category_code}, ${spelled}. ${queue.category_name}. Silakan menuju loket ${queue.category_code}.`;
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = 'id-ID';
		utterance.rate = rate;
		utterance.pitch = 1.05;

		const voices = window.speechSynthesis.getVoices();
		const idVoice = voices.find((v) => v.lang.includes('id') || v.lang.includes('ID'));
		if (idVoice) utterance.voice = idVoice;

		window.speechSynthesis.speak(utterance);
	}, delay);
}
