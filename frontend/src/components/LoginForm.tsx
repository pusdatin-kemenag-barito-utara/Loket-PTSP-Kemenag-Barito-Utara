import React from 'react';
import { api } from '../lib/api';
import { EyeIcon, EyeOffIcon, LockClosedIcon, ShieldCheckIcon, UserIcon } from './common/Icons';

declare global {
	interface Window {
		turnstile?: {
			render: (
				el: HTMLElement,
				options: {
					sitekey: string;
					callback: (token: string) => void;
					'expired-callback'?: () => void;
					'error-callback'?: (code?: string) => void;
					theme?: 'dark' | 'light' | 'auto';
					size?: 'normal' | 'compact' | 'flexible';
				},
			) => string;
			reset?: (widgetId?: string) => void;
			remove?: (widgetId: string) => void;
		};
	}
}

interface LoginFormProps {
	siteKey?: string;
}

export default function LoginForm({ siteKey = '' }: LoginFormProps) {
	const [activeSiteKey, setActiveSiteKey] = React.useState<string>(siteKey);
	const [username, setUsername] = React.useState('');
	const [password, setPassword] = React.useState('');
	const [showPassword, setShowPassword] = React.useState(false);
	const [token, setToken] = React.useState('');
	const [error, setError] = React.useState<string | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [failedAttempts, setFailedAttempts] = React.useState(0);
	const [lockoutSeconds, setLockoutSeconds] = React.useState(0);
	const [captchaLoading, setCaptchaLoading] = React.useState(true);
	const [captchaError, setCaptchaError] = React.useState(false);

	const captchaRef = React.useRef<HTMLDivElement>(null);
	const widgetIdRef = React.useRef<string | null>(null);

	// Fetch dynamic Turnstile Site Key from backend to guarantee zero key mismatch
	React.useEffect(() => {
		let isMounted = true;
		api.authConfig()
			.then((cfg) => {
				if (isMounted && cfg?.turnstile_site_key) {
					setActiveSiteKey(cfg.turnstile_site_key);
				}
			})
			.catch(() => {
				// Keep fallback siteKey from prop
			});
		return () => {
			isMounted = false;
		};
	}, []);

	// Anti-BFCache & Check if session already authenticated
	React.useEffect(() => {
		let isMounted = true;
		const checkSession = () => {
			api.me()
				.then((user) => {
					if (isMounted && user) {
						// Already authenticated: replace history to prevent Back button loop
						window.location.replace('/admin');
					}
				})
				.catch(() => {
					/* Unauthenticated, proceed to login form */
				});
		};

		checkSession();

		const handlePageShow = (event: PageTransitionEvent) => {
			if (event.persisted) {
				checkSession();
			}
		};

		window.addEventListener('pageshow', handlePageShow);
		return () => {
			isMounted = false;
			window.removeEventListener('pageshow', handlePageShow);
		};
	}, []);

	// Lockout countdown timer
	React.useEffect(() => {
		if (lockoutSeconds <= 0) return;
		const timer = setInterval(() => {
			setLockoutSeconds((prev) => {
				if (prev <= 1) {
					clearInterval(timer);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
		return () => clearInterval(timer);
	}, [lockoutSeconds]);

	// Initialize and render Cloudflare Turnstile widget
	const resetCaptcha = React.useCallback(() => {
		setToken('');
		setCaptchaError(false);
		if (widgetIdRef.current && window.turnstile?.reset) {
			try {
				window.turnstile.reset(widgetIdRef.current);
			} catch {
				/* ignore */
			}
		}
	}, []);

	React.useEffect(() => {
		if (!activeSiteKey || !captchaRef.current) return;

		let isCancelled = false;
		setCaptchaLoading(true);

		const mountTurnstile = () => {
			if (!window.turnstile || !captchaRef.current || isCancelled) return;

			// If previous widget was mounted, clean it up
			if (widgetIdRef.current && window.turnstile.remove) {
				try {
					window.turnstile.remove(widgetIdRef.current);
				} catch {
					/* ignore */
				}
				widgetIdRef.current = null;
			}

			try {
				const id = window.turnstile.render(captchaRef.current, {
					sitekey: activeSiteKey,
					callback: (receivedToken: string) => {
						if (!isCancelled) {
							setToken(receivedToken);
							setError(null);
							setCaptchaError(false);
						}
					},
					'expired-callback': () => {
						if (!isCancelled) {
							setToken('');
							if (widgetIdRef.current && window.turnstile?.reset) {
								window.turnstile.reset(widgetIdRef.current);
							}
						}
					},
					'error-callback': () => {
						if (!isCancelled) {
							setToken('');
							setCaptchaError(true);
							setCaptchaLoading(false);
						}
					},
					theme: 'dark',
					size: 'flexible',
				});
				widgetIdRef.current = id;
				setCaptchaLoading(false);
			} catch (err) {
				if (!isCancelled) {
					setCaptchaError(true);
					setCaptchaLoading(false);
				}
			}
		};

		if (window.turnstile) {
			mountTurnstile();
		} else {
			const existingScript = document.querySelector('script[src*="turnstile/v0/api.js"]');
			if (!existingScript) {
				const s = document.createElement('script');
				s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
				s.async = true;
				s.defer = true;
				s.onload = mountTurnstile;
				s.onerror = () => {
					if (!isCancelled) {
						setCaptchaError(true);
						setCaptchaLoading(false);
					}
				};
				document.head.appendChild(s);
			} else {
				const timer = setInterval(() => {
					if (window.turnstile) {
						clearInterval(timer);
						mountTurnstile();
					}
				}, 100);
				return () => clearInterval(timer);
			}
		}

		return () => {
			isCancelled = true;
			if (widgetIdRef.current && window.turnstile?.remove) {
				try {
					window.turnstile.remove(widgetIdRef.current);
				} catch {
					/* ignore */
				}
				widgetIdRef.current = null;
			}
		};
	}, [activeSiteKey]);

	// Sanitizer to block XSS and malicious characters on typing
	const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value;
		// Strip illegal control and script-like tags
		const sanitized = raw.replace(/[<>"'`;\\]/g, '');
		setUsername(sanitized);
		if (error) setError(null);
	};

	const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPassword(e.target.value);
		if (error) setError(null);
	};

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (lockoutSeconds > 0) return;

		const cleanUser = username.trim();
		if (!cleanUser || !password) {
			setError('Username dan password wajib diisi.');
			return;
		}

		// Security: Validate username format
		const usernameRegex = /^[a-zA-Z0-9_.@+-]+$/;
		if (!usernameRegex.test(cleanUser)) {
			setError('Format username tidak valid. Gunakan huruf, angka, atau email resmi.');
			return;
		}

		if (activeSiteKey && !token) {
			setError('Harap selesaikan verifikasi captcha Cloudflare terlebih dahulu.');
			return;
		}

		setLoading(true);
		setError(null);

		try {
			await api.login(cleanUser, password, token);
			// Successful login: replace history so browser Back button cannot return to login
			window.location.replace('/admin');
		} catch (err: unknown) {
			const nextAttempts = failedAttempts + 1;
			setFailedAttempts(nextAttempts);

			// Cloudflare tokens are single-use; reset widget immediately upon failure
			resetCaptcha();

			// Handle lockout
			if (nextAttempts >= 5) {
				setLockoutSeconds(60);
				setError('Terlalu banyak percobaan gagal. Akses ditangguhkan selama 60 detik.');
			} else if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 429) {
				setLockoutSeconds(900); // 15 mins server lockout
				setError('Akses dibatasi sementara oleh sistem keamanan server (15 menit).');
			} else {
				const errMsg = err instanceof Error ? err.message : 'Username atau password salah.';
				setError(errMsg);
			}

			// Clear password for security
			setPassword('');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="relative w-full max-w-md">
			{/* Ambient Outer Aura */}
			<div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-emerald-500/20 blur-xl opacity-70 transition duration-1000 group-hover:opacity-100 pointer-events-none" />

			{/* Main Auth Card */}
			<form
				onSubmit={submit}
				className="relative w-full rounded-3xl border border-emerald-500/25 bg-slate-900/90 p-7 sm:p-9 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
				noValidate
			>
				{/* Header Section */}
				<div className="mb-7 text-center">
					<div className="mx-auto mb-3.5 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/30 bg-gradient-to-br from-emerald-950 via-slate-900 to-amber-950/40 p-2.5 shadow-inner">
						<img
							src="/kemenag.svg"
							alt="Kemenag"
							className="h-11 w-11 object-contain drop-shadow-[0_0_12px_rgba(255,199,44,0.45)]"
						/>
					</div>

					<div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-400">
						<span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
						Portal Resmi Petugas
					</div>

					<h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white">
						Masuk Admin PTSP
					</h1>
					<p className="mt-1 text-xs text-slate-400">
						Kantor Kementerian Agama Kabupaten Barito Utara
					</p>
				</div>

				{/* Error / Alert Banner */}
				{error && (
					<div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/50 p-3.5 text-xs text-rose-200">
						<svg
							className="mt-0.5 h-4 w-4 shrink-0 text-rose-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
						<div className="flex-1">
							<p className="font-semibold text-rose-300">Autentikasi Gagal</p>
							<p className="mt-0.5 leading-relaxed">{error}</p>
						</div>
					</div>
				)}

				<div className="space-y-4">
					{/* Username Field */}
					<div>
						<label className="block text-xs font-semibold text-slate-300 mb-1.5">
							Username / Email Kedinasan
						</label>
						<div className="relative">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
								<UserIcon className="h-4.5 w-4.5" />
							</div>
							<input
								type="text"
								value={username}
								onChange={handleUsernameChange}
								autoComplete="username"
								placeholder="baritoutara@kemenag.go.id"
								disabled={loading || lockoutSeconds > 0}
								maxLength={100}
								className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/40 disabled:opacity-50"
							/>
						</div>
					</div>

					{/* Password Field */}
					<div>
						<label className="block text-xs font-semibold text-slate-300 mb-1.5">
							Kata Sandi
						</label>
						<div className="relative">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
								<LockClosedIcon className="h-4.5 w-4.5" />
							</div>
							<input
								type={showPassword ? 'text' : 'password'}
								value={password}
								onChange={handlePasswordChange}
								autoComplete="current-password"
								placeholder="••••••••••••"
								disabled={loading || lockoutSeconds > 0}
								maxLength={128}
								className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2.5 pl-10 pr-11 text-sm text-white placeholder-slate-500 outline-none transition focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/40 disabled:opacity-50"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
								title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
								tabIndex={-1}
							>
								{showPassword ? <EyeOffIcon className="h-4.5 w-4.5" /> : <EyeIcon className="h-4.5 w-4.5" />}
							</button>
						</div>
					</div>

					{/* Cloudflare Turnstile Section */}
					{activeSiteKey && (
						<div className="pt-1">
							<div className="rounded-xl border border-emerald-500/20 bg-slate-950/80 p-2 shadow-inner">
								<div
									ref={captchaRef}
									className="flex min-h-[65px] items-center justify-center w-full [&>iframe]:!w-full [&>iframe]:!max-w-full"
								/>
								{captchaLoading && !token && (
									<div className="flex items-center justify-center gap-2 py-2 text-xs text-slate-400">
										<span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
										Menyiapkan verifikasi keamanan...
									</div>
								)}
							</div>

							{captchaError && (
								<div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-rose-400">
									<span>Verifikasi gagal dimuat.</span>
									<button
										type="button"
										onClick={resetCaptcha}
										className="font-semibold text-amber-400 hover:underline cursor-pointer"
									>
										Coba Lagi
									</button>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Submit Button */}
				<button
					type="submit"
					disabled={loading || lockoutSeconds > 0 || (!!activeSiteKey && !token)}
					className="btn mt-6 w-full rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 transition duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
				>
					{lockoutSeconds > 0 ? (
						<span>Terkunci Sementara ({lockoutSeconds}d)</span>
					) : loading ? (
						<span className="flex items-center justify-center gap-2">
							<span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
							Memverifikasi Kredensial...
						</span>
					) : (
						<span>Masuk Portal Admin</span>
					)}
				</button>

				{/* Security Assurance Badges */}
				<div className="mt-6 border-t border-white/5 pt-4 text-center">
					<div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
						<ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-400" />
						<span>256-bit SSL Enkripsi • Cloudflare Protected</span>
					</div>
					<p className="mt-1 text-[10px] text-slate-500">
						Pusat Data dan Informasi (Pusdatin) Kemenag Barito Utara
					</p>
				</div>
			</form>
		</div>
	);
}