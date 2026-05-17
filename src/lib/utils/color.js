/**
 * Convert a hex color string to HSL values.
 * @param {string} hex - Hex color string like "#3b82f6"
 * @returns {{ h: number, s: number, l: number }} h 0-360, s 0-100, l 0-100
 */
export function hexToHsl(hex) {
	const normalized = hex.replace('#', '');
	const r = parseInt(normalized.substring(0, 2), 16) / 255;
	const g = parseInt(normalized.substring(2, 4), 16) / 255;
	const b = parseInt(normalized.substring(4, 6), 16) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;

	if (max === min) {
		return { h: 0, s: 0, l: Math.round(l * 100) };
	}

	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

	let h;
	switch (max) {
		case r:
			h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
			break;
		case g:
			h = ((b - r) / d + 2) / 6;
			break;
		case b:
			h = ((r - g) / d + 4) / 6;
			break;
	}

	return {
		h: Math.round(h * 360),
		s: Math.round(s * 100),
		l: Math.round(l * 100)
	};
}

/**
 * Convert HSL values to a hex color string.
 * @param {number} h - Hue 0-360
 * @param {number} s - Saturation 0-100
 * @param {number} l - Lightness 0-100
 * @returns {string} Hex color string like "#3b82f6"
 */
export function hslToHex(h, s, l) {
	const hue = h / 360;
	const sat = s / 100;
	const lig = l / 100;

	const toHex = (c) =>
		Math.round(Math.min(255, Math.max(0, c * 255)))
			.toString(16)
			.padStart(2, '0');

	if (sat === 0) {
		const v = toHex(lig);
		return `#${v}${v}${v}`;
	}

	const hue2rgb = (p, q, t) => {
		let tt = t;
		if (tt < 0) tt += 1;
		if (tt > 1) tt -= 1;
		if (tt < 1 / 6) return p + (q - p) * 6 * tt;
		if (tt < 1 / 2) return q;
		if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
		return p;
	};

	const q = lig < 0.5 ? lig * (1 + sat) : lig + sat - lig * sat;
	const p = 2 * lig - q;

	return `#${toHex(hue2rgb(p, q, hue + 1 / 3))}${toHex(hue2rgb(p, q, hue))}${toHex(hue2rgb(p, q, hue - 1 / 3))}`;
}

/**
 * Clamp lightness to a range, defaulting to [15, 85] to avoid near-black/near-white.
 * @param {number} l - Lightness value 0-100
 * @param {number} [min=15]
 * @param {number} [max=85]
 * @returns {number}
 */
export function clampLightness(l, min = 15, max = 85) {
	return Math.min(max, Math.max(min, l));
}

/**
 * Convert HSL to RGB triple (0-255 each). Avoids string formatting overhead
 * for canvas pixel loops.
 * @param {number} h - Hue 0-360
 * @param {number} s - Saturation 0-100
 * @param {number} l - Lightness 0-100
 * @returns {[number, number, number]}
 */
export function hslToRgb(h, s, l) {
	const hue = h / 360;
	const sat = s / 100;
	const lig = l / 100;

	if (sat === 0) {
		const v = Math.round(lig * 255);
		return [v, v, v];
	}

	const hue2rgb = (p, q, t) => {
		let tt = t;
		if (tt < 0) tt += 1;
		if (tt > 1) tt -= 1;
		if (tt < 1 / 6) return p + (q - p) * 6 * tt;
		if (tt < 1 / 2) return q;
		if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
		return p;
	};

	const q = lig < 0.5 ? lig * (1 + sat) : lig + sat - lig * sat;
	const p = 2 * lig - q;

	return [
		Math.round(hue2rgb(p, q, hue + 1 / 3) * 255),
		Math.round(hue2rgb(p, q, hue) * 255),
		Math.round(hue2rgb(p, q, hue - 1 / 3) * 255)
	];
}

/**
 * Check if a string is a valid 6-character hex color (with #).
 * @param {string} str
 * @returns {boolean}
 */
export function isValidHex(str) {
	return /^#[0-9a-fA-F]{6}$/.test(str);
}
