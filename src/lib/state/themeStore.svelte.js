import { createContext } from 'svelte';
import { storageGet, storageSet } from '$lib/scripts/storage.js';

const FONT_FAMILIES = {
	'system-ui': "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
	inter: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
	serif: "'Merriweather', Georgia, Cambria, 'Times New Roman', serif",
	mono: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace"
};

const THEME_PRESETS = {
	default: {
		label: 'Default',
		description: 'Balanced neutral palette',
		accent: '#2563eb',
		light: {
			bg: '#e8effb',
			gradient1: '#e2e8f0',
			gradient2: '#f8fafc',
			cardBg: '#ffffff',
			text: '#1f2937',
			textHeading: '#0f172a',
			textSecondary: '#475569',
			textMuted: '#94a3b8',
			border: '#dbe4f2',
			borderInput: '#cbd5e1',
			inputBg: '#f8fafc',
			todoBg: '#f8fafc',
			shadow: 'rgba(31, 41, 55, 0.12)'
		},
		dark: {
			bg: '#0b1120',
			gradient1: '#0b1120',
			gradient2: '#1a2332',
			cardBg: '#1a2332',
			text: '#e2e8f0',
			textHeading: '#f1f5f9',
			textSecondary: '#94a3b8',
			textMuted: '#64748b',
			border: '#2d3a4e',
			borderInput: '#3b4a62',
			inputBg: '#0b1120',
			todoBg: '#0f1729',
			shadow: 'rgba(0, 0, 0, 0.5)'
		}
	},
	forest: {
		label: 'Forest',
		description: 'Warm greens and earthy neutrals',
		accent: '#16a34a',
		light: {
			bg: '#eef6ef',
			gradient1: '#e5f1e7',
			gradient2: '#f8fcf8',
			cardBg: '#ffffff',
			text: '#1f2d1f',
			textHeading: '#112211',
			textSecondary: '#405642',
			textMuted: '#7a9080',
			border: '#d8e7d8',
			borderInput: '#bfd4c0',
			inputBg: '#f2f9f2',
			todoBg: '#f4faf4',
			shadow: 'rgba(16, 52, 22, 0.14)'
		},
		dark: {
			bg: '#0f1a12',
			gradient1: '#0f1a12',
			gradient2: '#1a2a1f',
			cardBg: '#17261c',
			text: '#dbe9dc',
			textHeading: '#eef8ef',
			textSecondary: '#a8c2aa',
			textMuted: '#6f8a71',
			border: '#294033',
			borderInput: '#335240',
			inputBg: '#111e16',
			todoBg: '#132218',
			shadow: 'rgba(0, 0, 0, 0.55)'
		}
	},
	ocean: {
		label: 'Ocean',
		description: 'Cool blues and cyan highlights',
		accent: '#0891b2',
		light: {
			bg: '#eaf5ff',
			gradient1: '#dfedfb',
			gradient2: '#f5fbff',
			cardBg: '#ffffff',
			text: '#15324a',
			textHeading: '#0b2235',
			textSecondary: '#3a5f7d',
			textMuted: '#7ea0bb',
			border: '#cfe2f2',
			borderInput: '#b7d2e8',
			inputBg: '#f4f9fd',
			todoBg: '#f1f8ff',
			shadow: 'rgba(24, 56, 87, 0.16)'
		},
		dark: {
			bg: '#091827',
			gradient1: '#091827',
			gradient2: '#11273d',
			cardBg: '#10233a',
			text: '#d8e9f6',
			textHeading: '#eef7ff',
			textSecondary: '#9ec2dc',
			textMuted: '#6689a5',
			border: '#23405d',
			borderInput: '#2c4e70',
			inputBg: '#0d1d2f',
			todoBg: '#102032',
			shadow: 'rgba(0, 0, 0, 0.56)'
		}
	},
	sunset: {
		label: 'Sunset',
		description: 'Warm oranges and rose tones',
		accent: '#ea580c',
		light: {
			bg: '#fff2eb',
			gradient1: '#ffe9dc',
			gradient2: '#fff8f4',
			cardBg: '#ffffff',
			text: '#4a2619',
			textHeading: '#35170f',
			textSecondary: '#7a4737',
			textMuted: '#b08472',
			border: '#f1d9cc',
			borderInput: '#e8c6b3',
			inputBg: '#fff7f1',
			todoBg: '#fff4ec',
			shadow: 'rgba(102, 44, 25, 0.14)'
		},
		dark: {
			bg: '#23130f',
			gradient1: '#23130f',
			gradient2: '#3a1d16',
			cardBg: '#2f1813',
			text: '#fde6dc',
			textHeading: '#fff3ed',
			textSecondary: '#efb6a2',
			textMuted: '#b88474',
			border: '#5b2f23',
			borderInput: '#6d3b2d',
			inputBg: '#271511',
			todoBg: '#2d1812',
			shadow: 'rgba(0, 0, 0, 0.55)'
		}
	},
	midnight: {
		label: 'Midnight',
		description: 'Deep dark surfaces with neon contrast',
		accent: '#6366f1',
		light: {
			bg: '#dce3ff',
			gradient1: '#d4ddfb',
			gradient2: '#eef2ff',
			cardBg: '#f8faff',
			text: '#1b2042',
			textHeading: '#0f1230',
			textSecondary: '#4c5585',
			textMuted: '#7a83b2',
			border: '#c8d1f1',
			borderInput: '#b3bee3',
			inputBg: '#eff3ff',
			todoBg: '#edf1ff',
			shadow: 'rgba(18, 22, 56, 0.2)'
		},
		dark: {
			bg: '#060814',
			gradient1: '#060814',
			gradient2: '#11142a',
			cardBg: '#0d1125',
			text: '#dce4ff',
			textHeading: '#f3f6ff',
			textSecondary: '#a8b8ef',
			textMuted: '#6f83bf',
			border: '#242b52',
			borderInput: '#323b6b',
			inputBg: '#090d1f',
			todoBg: '#0b1022',
			shadow: 'rgba(0, 0, 0, 0.65)'
		}
	}
};

/**
 * @param {string} hex
 * @returns {string}
 */
function toSafeHex(hex) {
	if (typeof hex !== 'string') return '#3b82f6';
	const normalized = hex.trim();
	if (/^#[0-9a-fA-F]{6}$/.test(normalized)) return normalized.toLowerCase();
	return '#3b82f6';
}

/**
 * @param {string} hex
 * @param {number} amount
 * @returns {string}
 */
function shiftHex(hex, amount) {
	const safe = toSafeHex(hex).slice(1);
	const r = Math.min(255, Math.max(0, parseInt(safe.slice(0, 2), 16) + amount));
	const g = Math.min(255, Math.max(0, parseInt(safe.slice(2, 4), 16) + amount));
	const b = Math.min(255, Math.max(0, parseInt(safe.slice(4, 6), 16) + amount));
	return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

class ThemeStore {
	themePreset = $state('default');
	accentColor = $state('#3b82f6');
	bgColor = $state('#ffffff');
	cardColor = $state('#f8fafc');
	textColor = $state('#1e293b');
	borderColor = $state('#e2e8f0');
	fontFamily = $state('system-ui');

	/** @type {Array<{id: string, label: string, description: string, light: Record<string,string>, dark: Record<string,string>}>} */
	presetThemes = Object.entries(THEME_PRESETS).map(([id, preset]) => ({ id, ...preset }));

	/** @type {Array<{id: 'system-ui'|'inter'|'serif'|'mono', label: string}>} */
	fontOptions = [
		{ id: 'system-ui', label: 'System UI' },
		{ id: 'inter', label: 'Inter' },
		{ id: 'serif', label: 'Serif' },
		{ id: 'mono', label: 'Mono' }
	];

	/** @type {import('./authStore.svelte.js').AuthStore|null} */
	_auth = null;
	_hasLoadedServerSettings = $state(false);
	_isHydratingFromServer = false;
	_applyFrame = 0;

	/**
	 * @param {import('./authStore.svelte.js').AuthStore} auth
	 */
	constructor(auth) {
		this._auth = auth;
		this._init();

		if (typeof window !== 'undefined') {
			window.addEventListener('storage', this._handleStorageChange.bind(this));
		}

		$effect(() => {
			const isLoggedIn = this._auth?.isLoggedIn || false;
			if (isLoggedIn && !this._hasLoadedServerSettings) {
				this._loadFromServerSettings();
			}
			if (!isLoggedIn && this._hasLoadedServerSettings) {
				this._hasLoadedServerSettings = false;
			}
		});

		$effect(() => {
			const preset = this.themePreset;
			const accent = toSafeHex(this.accentColor);
			const bg = toSafeHex(this.bgColor);
			const card = toSafeHex(this.cardColor);
			const text = toSafeHex(this.textColor);
			const border = toSafeHex(this.borderColor);
			const font = this.fontFamily;

			if (typeof requestAnimationFrame === 'function') {
				if (this._applyFrame) cancelAnimationFrame(this._applyFrame);
				this._applyFrame = requestAnimationFrame(() => {
					this._applyToDocument(preset, accent, bg, card, text, border, font);
					this._applyFrame = 0;
				});
			} else {
				this._applyToDocument(preset, accent, bg, card, text, border, font);
			}
		});

		$effect(() => {
			const payload = {
				themePreset: this.themePreset,
				accentColor: toSafeHex(this.accentColor),
				bgColor: toSafeHex(this.bgColor),
				cardColor: toSafeHex(this.cardColor),
				textColor: toSafeHex(this.textColor),
				borderColor: toSafeHex(this.borderColor),
				fontFamily: this.fontFamily
			};

			storageSet('themePreset', payload.themePreset);
			storageSet('accentColor', payload.accentColor);
			storageSet('bgColor', payload.bgColor);
			storageSet('cardColor', payload.cardColor);
			storageSet('textColor', payload.textColor);
			storageSet('borderColor', payload.borderColor);
			storageSet('fontFamily', payload.fontFamily);

			if (!this._isHydratingFromServer && this._auth?.isLoggedIn && this._hasLoadedServerSettings) {
				this._syncTheme(payload);
			}
		});
	}

	_init() {
		const savedThemePreset = storageGet('themePreset');
		if (typeof savedThemePreset === 'string' && THEME_PRESETS[savedThemePreset]) {
			this.themePreset = savedThemePreset;
		}

		const savedAccent = storageGet('accentColor');
		if (typeof savedAccent === 'string') {
			this.accentColor = toSafeHex(savedAccent);
		}

		const savedBgColor = storageGet('bgColor');
		if (typeof savedBgColor === 'string') {
			this.bgColor = toSafeHex(savedBgColor);
		}

		const savedCardColor = storageGet('cardColor');
		if (typeof savedCardColor === 'string') {
			this.cardColor = toSafeHex(savedCardColor);
		}

		const savedTextColor = storageGet('textColor');
		if (typeof savedTextColor === 'string') {
			this.textColor = toSafeHex(savedTextColor);
		}

		const savedBorderColor = storageGet('borderColor');
		if (typeof savedBorderColor === 'string') {
			this.borderColor = toSafeHex(savedBorderColor);
		}

		const savedFontFamily = storageGet('fontFamily');
		if (typeof savedFontFamily === 'string' && savedFontFamily in FONT_FAMILIES) {
			this.fontFamily = savedFontFamily;
		}
	}

	/**
	 * @param {string} preset
	 * @param {string} accent
	 * @param {string} bg
	 * @param {string} card
	 * @param {string} text
	 * @param {string} border
	 * @param {string} font
	 */
	_applyToDocument(preset, accent, bg, card, text, border, font) {
		if (typeof document === 'undefined') return;

		const root = document.documentElement;
		const selectedPreset = THEME_PRESETS[preset] || THEME_PRESETS.default;
		const lightTheme = selectedPreset.light;
		const darkTheme = selectedPreset.dark;

		const lightBg = preset === 'custom' ? bg : lightTheme.bg;
		const lightCardBg = preset === 'custom' ? card : lightTheme.cardBg;
		const lightText = preset === 'custom' ? text : lightTheme.text;
		const lightTextHeading = preset === 'custom' ? text : lightTheme.textHeading;
		const lightBorder = preset === 'custom' ? border : lightTheme.border;

		const darkBg = preset === 'custom' ? shiftHex(bg, -205) : darkTheme.bg;
		const darkCardBg = preset === 'custom' ? shiftHex(card, -190) : darkTheme.cardBg;
		const darkText = preset === 'custom' ? shiftHex(text, 125) : darkTheme.text;
		const darkTextHeading = preset === 'custom' ? shiftHex(text, 155) : darkTheme.textHeading;
		const darkBorder = preset === 'custom' ? shiftHex(border, -155) : darkTheme.border;

		root.style.setProperty('--theme-light-bg', lightBg);
		root.style.setProperty(
			'--theme-light-gradient-1',
			preset === 'custom' ? shiftHex(bg, -8) : lightTheme.gradient1
		);
		root.style.setProperty(
			'--theme-light-gradient-2',
			preset === 'custom' ? shiftHex(bg, 14) : lightTheme.gradient2
		);
		root.style.setProperty('--theme-light-card-bg', lightCardBg);
		root.style.setProperty('--theme-light-text', lightText);
		root.style.setProperty('--theme-light-text-heading', lightTextHeading);
		root.style.setProperty(
			'--theme-light-text-secondary',
			preset === 'custom' ? shiftHex(text, 56) : lightTheme.textSecondary
		);
		root.style.setProperty(
			'--theme-light-text-muted',
			preset === 'custom' ? shiftHex(text, 90) : lightTheme.textMuted
		);
		root.style.setProperty('--theme-light-border', lightBorder);
		root.style.setProperty(
			'--theme-light-border-input',
			preset === 'custom' ? shiftHex(border, -18) : lightTheme.borderInput
		);
		root.style.setProperty('--theme-light-input-bg', preset === 'custom' ? shiftHex(bg, 18) : lightTheme.inputBg);
		root.style.setProperty('--theme-light-todo-bg', preset === 'custom' ? shiftHex(bg, 14) : lightTheme.todoBg);
		root.style.setProperty('--theme-light-shadow', lightTheme.shadow);

		root.style.setProperty('--theme-dark-bg', darkBg);
		root.style.setProperty(
			'--theme-dark-gradient-1',
			preset === 'custom' ? shiftHex(darkBg, -8) : darkTheme.gradient1
		);
		root.style.setProperty(
			'--theme-dark-gradient-2',
			preset === 'custom' ? shiftHex(darkBg, 18) : darkTheme.gradient2
		);
		root.style.setProperty('--theme-dark-card-bg', darkCardBg);
		root.style.setProperty('--theme-dark-text', darkText);
		root.style.setProperty('--theme-dark-text-heading', darkTextHeading);
		root.style.setProperty(
			'--theme-dark-text-secondary',
			preset === 'custom' ? shiftHex(darkText, -65) : darkTheme.textSecondary
		);
		root.style.setProperty(
			'--theme-dark-text-muted',
			preset === 'custom' ? shiftHex(darkText, -105) : darkTheme.textMuted
		);
		root.style.setProperty('--theme-dark-border', darkBorder);
		root.style.setProperty(
			'--theme-dark-border-input',
			preset === 'custom' ? shiftHex(darkBorder, 16) : darkTheme.borderInput
		);
		root.style.setProperty('--theme-dark-input-bg', preset === 'custom' ? shiftHex(darkBg, 14) : darkTheme.inputBg);
		root.style.setProperty(
			'--theme-dark-todo-bg',
			preset === 'custom' ? shiftHex(darkCardBg, -8) : darkTheme.todoBg
		);
		root.style.setProperty('--theme-dark-shadow', darkTheme.shadow);

		root.style.setProperty('--theme-accent', accent);
		root.style.setProperty('--theme-accent-hover', shiftHex(accent, -22));
		root.style.setProperty('--theme-accent-hover-dark', shiftHex(accent, 22));
		root.style.setProperty('--app-font-family', FONT_FAMILIES[font] || FONT_FAMILIES['system-ui']);

		this._updateFavicon(accent);
		this._updateAppleTouchIcon(accent);
	}

	_generateFaviconSvg(accent) {
		return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
	<rect x="16" y="16" width="480" height="480" rx="96" ry="96" fill="${accent}"/>
	<path d="M140 270l70 70 160-160" fill="none" stroke="#ffffff" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
	}

	_updateFavicon(accent) {
		const link = document.querySelector('link[rel="icon"]');
		if (!link) return;
		const svg = this._generateFaviconSvg(accent);
		link.href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
	}

	_updateAppleTouchIcon(accent) {
		const size = 512;
		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d');

		// Draw rounded-rect background
		const r = 96;
		ctx.beginPath();
		ctx.roundRect(0, 0, size, size, [r]);
		ctx.fillStyle = accent;
		ctx.fill();

		// Draw checkmark
		ctx.beginPath();
		ctx.moveTo(150, 260);
		ctx.lineTo(220, 330);
		ctx.lineTo(370, 180);
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 44;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.stroke();

		const dataUri = canvas.toDataURL('image/png');

		for (const sizeAttr of ['192', '512']) {
			const link = document.querySelector(`link[rel="apple-touch-icon"][sizes="${sizeAttr}x${sizeAttr}"]`);
			if (link) link.href = dataUri;
		}
	}

	/**
	 * @param {Record<string, unknown>} theme
	 */
	_syncTheme(theme) {
		fetch('/api/todos/settings', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				settings: {
					theme,
					display: {
						fontFamily: this.fontFamily
					}
				}
			})
		}).catch(() => {
			// Theme settings are persisted locally first; server sync can retry later.
		});
	}

	async _loadFromServerSettings() {
		if (!this._auth?.isLoggedIn || this._isHydratingFromServer) return;

		this._isHydratingFromServer = true;
		try {
			const res = await fetch('/api/todos/settings');
			if (res.ok) {
				const data = await res.json();
				const theme = data.settings?.theme;
				const display = data.settings?.display;

				if (theme && typeof theme === 'object') {
					if (typeof theme.themePreset === 'string' && THEME_PRESETS[theme.themePreset]) {
						this.themePreset = theme.themePreset;
					}
					if (typeof theme.accentColor === 'string') {
						this.accentColor = toSafeHex(theme.accentColor);
					}
					if (typeof theme.bgColor === 'string') {
						this.bgColor = toSafeHex(theme.bgColor);
					}
					if (typeof theme.cardColor === 'string') {
						this.cardColor = toSafeHex(theme.cardColor);
					}
					if (typeof theme.textColor === 'string') {
						this.textColor = toSafeHex(theme.textColor);
					}
					if (typeof theme.borderColor === 'string') {
						this.borderColor = toSafeHex(theme.borderColor);
					}
				}

				if (display && typeof display === 'object' && typeof display.fontFamily === 'string') {
					if (display.fontFamily in FONT_FAMILIES) {
						this.fontFamily = display.fontFamily;
					}
				}
			}
		} catch {
			// Keep local theme when server settings cannot be fetched.
		} finally {
			this._isHydratingFromServer = false;
			this._hasLoadedServerSettings = true;
		}
	}

	/**
	 * @param {StorageEvent} e
	 */
	_handleStorageChange(e) {
		if (e.key === 'themePreset') {
			const themePreset = storageGet('themePreset');
			if (typeof themePreset === 'string' && THEME_PRESETS[themePreset]) {
				this.themePreset = themePreset;
			}
		} else if (e.key === 'accentColor') {
			const accentColor = storageGet('accentColor');
			if (typeof accentColor === 'string') {
				this.accentColor = toSafeHex(accentColor);
			}
		} else if (e.key === 'bgColor') {
			const bgColor = storageGet('bgColor');
			if (typeof bgColor === 'string') {
				this.bgColor = toSafeHex(bgColor);
			}
		} else if (e.key === 'cardColor') {
			const cardColor = storageGet('cardColor');
			if (typeof cardColor === 'string') {
				this.cardColor = toSafeHex(cardColor);
			}
		} else if (e.key === 'textColor') {
			const textColor = storageGet('textColor');
			if (typeof textColor === 'string') {
				this.textColor = toSafeHex(textColor);
			}
		} else if (e.key === 'borderColor') {
			const borderColor = storageGet('borderColor');
			if (typeof borderColor === 'string') {
				this.borderColor = toSafeHex(borderColor);
			}
		} else if (e.key === 'fontFamily') {
			const fontFamily = storageGet('fontFamily');
			if (typeof fontFamily === 'string' && fontFamily in FONT_FAMILIES) {
				this.fontFamily = fontFamily;
			}
		}
	}
}

/** @typedef {InstanceType<typeof ThemeStore>} ThemeStoreType */

export const [getThemeStore, setThemeStore] = createContext /** @type {ThemeStoreType} */();

/**
 * @param {import('./authStore.svelte.js').AuthStore} auth
 * @returns {ThemeStoreType}
 */
export function createThemeStore(auth) {
	const store = new ThemeStore(auth);
	setThemeStore(store);
	return store;
}

export { ThemeStore, THEME_PRESETS };
