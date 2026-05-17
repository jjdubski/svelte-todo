<script>
	import { hexToHsl, hslToHex, hslToRgb, clampLightness, isValidHex } from '$lib/utils/color.js';

	let { value = '#3b82f6', oncolorchange, label } = $props();

	const SL_W = 220;
	const SL_H = 150;
	const HUE_H = 14;
	const L_MIN = 15;
	const L_MAX = 85;

	let hue = $state(0);
	let saturation = $state(0);
	let lightness = $state(50);
	let hexInput = $state('');

	let slCanvas = $state(null);
	let hueCanvas = $state(null);

	let dragTarget = $state(null);

	let lastEmitted = null;

	function getCanvasPos(canvas, clientX, clientY) {
		const rect = canvas.getBoundingClientRect();
		return {
			x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
			y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
		};
	}

	function emitColor() {
		const hex = hslToHex(hue, saturation, lightness);
		hexInput = hex;
		if (hex !== lastEmitted) {
			lastEmitted = hex;
			oncolorchange?.(hex);
		}
	}

	function updateColor(target, clientX, clientY) {
		if (target === 'sl') {
			const { x, y } = getCanvasPos(slCanvas, clientX, clientY);
			saturation = Math.round(x * 100);
			lightness = Math.round(L_MIN + (L_MAX - L_MIN) * (1 - y));
		} else {
			const { x } = getCanvasPos(hueCanvas, clientX, clientY);
			hue = Math.round(x * 360);
		}
		emitColor();
	}

	function startDrag(target, e) {
		const clientX = e.clientX ?? e.touches?.[0]?.clientX;
		const clientY = e.clientY ?? e.touches?.[0]?.clientY;
		if (clientX == null) return;
		dragTarget = target;
		updateColor(target, clientX, clientY);
		if (e.touches) e.preventDefault();
	}

	function handleHexInput(e) {
		const val = e.currentTarget.value;
		hexInput = val;
		if (isValidHex(val)) {
			const h = hexToHsl(val);
			hue = h.h;
			saturation = h.s;
			lightness = clampLightness(h.l);
			emitColor();
		}
	}

	function handleHexBlur(e) {
		if (!isValidHex(e.currentTarget.value)) {
			hexInput = value;
		}
	}

	$effect(() => {
		if (value === lastEmitted) return;
		const h = hexToHsl(value);
		hue = h.h;
		saturation = h.s;
		lightness = clampLightness(h.l);
		hexInput = value;
		lastEmitted = value;
	});

	$effect(() => {
		if (typeof window === 'undefined') return;

		function onMove(e) {
			if (!dragTarget) return;
			const clientX = e.clientX ?? e.touches?.[0]?.clientX;
			const clientY = e.clientY ?? e.touches?.[0]?.clientY;
			if (clientX == null) return;
			updateColor(dragTarget, clientX, clientY);
			if (typeof e.touches !== 'undefined') e.preventDefault();
		}

		function onUp() {
			dragTarget = null;
		}

		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
		window.addEventListener('touchmove', onMove, { passive: false });
		window.addEventListener('touchend', onUp);
		window.addEventListener('touchcancel', onUp);

		return () => {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
			window.removeEventListener('touchmove', onMove);
			window.removeEventListener('touchend', onUp);
			window.removeEventListener('touchcancel', onUp);
		};
	});

	$effect(() => {
		const canvas = slCanvas;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		const w = canvas.width;
		const h = canvas.height;

		const imgData = ctx.createImageData(w, h);
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const s = (x / w) * 100;
				const l = L_MIN + (L_MAX - L_MIN) * (1 - y / h);
				const [r, g, b] = hslToRgb(hue, s, l);
				const idx = (y * w + x) * 4;
				imgData.data[idx] = r;
				imgData.data[idx + 1] = g;
				imgData.data[idx + 2] = b;
				imgData.data[idx + 3] = 255;
			}
		}
		ctx.putImageData(imgData, 0, 0);

		const ix = (saturation / 100) * w;
		const iy = (1 - (lightness - L_MIN) / (L_MAX - L_MIN)) * h;
		ctx.beginPath();
		ctx.arc(ix, iy, 7, 0, Math.PI * 2);
		ctx.strokeStyle = '#fff';
		ctx.lineWidth = 2.5;
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(ix, iy, 6, 0, Math.PI * 2);
		ctx.strokeStyle = 'rgba(0,0,0,0.4)';
		ctx.lineWidth = 1.5;
		ctx.stroke();
	});

	$effect(() => {
		const canvas = hueCanvas;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		const w = canvas.width;
		const h = canvas.height;

		for (let x = 0; x < w; x++) {
			const hueVal = (x / w) * 360;
			const [r, g, b] = hslToRgb(hueVal, 100, 50);
			ctx.fillStyle = `rgb(${r},${g},${b})`;
			ctx.fillRect(x, 0, 1, h);
		}

		const ix = (hue / 360) * w;
		ctx.strokeStyle = '#fff';
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(ix, 0);
		ctx.lineTo(ix, h);
		ctx.stroke();
	});
</script>

<div class="color-picker" role="group" aria-label={label ?? 'Color picker'}>
	<div class="color-picker-header">
		<span class="color-picker-label">{label}</span>
		<div class="color-picker-value-row">
			<span class="color-swatch" style="background: {hslToHex(hue, saturation, lightness)}"></span>
			<input
				type="text"
				class="color-hex-input"
				value={hexInput}
				oninput={handleHexInput}
				onblur={handleHexBlur}
				maxlength="7"
				placeholder="#000000"
				aria-label="Hex color value"
			/>
		</div>
	</div>

	<canvas
		bind:this={slCanvas}
		width={SL_W}
		height={SL_H}
		class="color-sl-canvas"
		role="slider"
		aria-label="Saturation and lightness"
		aria-valuenow={lightness}
		aria-valuemin="0"
		aria-valuemax="100"
		aria-valuetext={`Saturation ${saturation}%, Lightness ${lightness}%`}
		onmousedown={(e) => startDrag('sl', e)}
		ontouchstart={(e) => startDrag('sl', e)}
	></canvas>

	<canvas
		bind:this={hueCanvas}
		width={SL_W}
		height={HUE_H}
		class="color-hue-canvas"
		role="slider"
		aria-label="Hue"
		aria-valuenow={hue}
		aria-valuemin="0"
		aria-valuemax="360"
		aria-valuetext={`Hue ${hue}°`}
		style="margin-top: 6px;"
		onmousedown={(e) => startDrag('hue', e)}
		ontouchstart={(e) => startDrag('hue', e)}
	></canvas>
</div>

<style>
	.color-picker {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.color-picker-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.color-picker-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-heading, #0f172a);
	}

	.color-picker-value-row {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.color-swatch {
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 0.25rem;
		border: 1px solid var(--border, #dbe4f2);
		flex-shrink: 0;
	}

	.color-hex-input {
		width: 5.5rem;
		padding: 0.2rem 0.375rem;
		font-size: 0.75rem;
		font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
		text-transform: uppercase;
		border: 1px solid var(--border, #dbe4f2);
		border-radius: 0.375rem;
		background: var(--input-bg, #f8fafc);
		color: var(--text, #1f2937);
		outline: none;
		transition: border-color 0.15s;
	}

	.color-hex-input:focus {
		border-color: var(--btn-primary, #3b82f6);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--btn-primary, #3b82f6) 20%, transparent);
	}

	.color-sl-canvas {
		width: 100%;
		height: auto;
		border-radius: 0.375rem;
		cursor: crosshair;
		touch-action: none;
		display: block;
	}

	.color-hue-canvas {
		width: 100%;
		height: auto;
		border-radius: 0.25rem;
		cursor: pointer;
		touch-action: none;
		display: block;
	}
</style>
