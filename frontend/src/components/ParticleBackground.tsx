import React from 'react';

interface ParticleBackgroundProps {
	className?: string;
	density?: number;
}

interface Particle {
	x: number;
	y: number;
	radius: number;
	color: string;
	alpha: number;
	vx: number;
	vy: number;
}

const COLORS = ['#ffc72c', '#006838', '#0a8a4d', '#ffffff'];

function random(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

/**
 * Animated canvas bokeh particle background in Kemenag colors.
 * Fixed full-screen, non-interactive.
 */
export default function ParticleBackground({ className = '', density = 0.00012 }: ParticleBackgroundProps) {
	const ref = React.useRef<HTMLCanvasElement>(null);

	React.useEffect(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		let rafId = 0;
		let particles: Particle[] = [];

		const resize = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			const count = Math.min(120, Math.floor(canvas.width * canvas.height * density));
			particles = Array.from({ length: count }, () => ({
				x: random(0, canvas.width),
				y: random(0, canvas.height),
				radius: random(1.5, 3.5),
				color: COLORS[Math.floor(random(0, COLORS.length))],
				alpha: random(0.15, 0.5),
				vx: random(-0.2, 0.2),
				vy: random(-0.2, 0.2),
			}));
		};

		const draw = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			for (const p of particles) {
				p.x += p.vx;
				p.y += p.vy;
				if (p.x < -10) p.x = canvas.width + 10;
				if (p.x > canvas.width + 10) p.x = -10;
				if (p.y < -10) p.y = canvas.height + 10;
				if (p.y > canvas.height + 10) p.y = -10;

				ctx.globalAlpha = p.alpha;
				ctx.fillStyle = p.color;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
			rafId = requestAnimationFrame(draw);
		};

		resize();
		draw();
		window.addEventListener('resize', resize);
		return () => {
			cancelAnimationFrame(rafId);
			window.removeEventListener('resize', resize);
		};
	}, [density]);

	return (
		<canvas
			ref={ref}
			className={`pointer-events-none fixed inset-0 -z-10 h-full w-full ${className}`}
			aria-hidden="true"
		/>
	);
}