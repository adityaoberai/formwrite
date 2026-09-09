import {
	DEFAULT_THEME,
	THEME_BACKGROUNDS,
	THEME_FONTS,
	THEME_LAYOUTS,
	THEME_LOGO_SIZES,
	THEME_RADII,
	type FormField,
	type FormLogo,
	type FormTheme
} from '$lib/types';

export const ACCENT_PRESETS: { name: string; value: string }[] = [
	{ name: 'Indigo', value: '#4f46e5' },
	{ name: 'Blue', value: '#2563eb' },
	{ name: 'Teal', value: '#0f766e' },
	{ name: 'Green', value: '#16a34a' },
	{ name: 'Amber', value: '#d97706' },
	{ name: 'Orange', value: '#ea580c' },
	{ name: 'Pink', value: '#db2777' },
	{ name: 'Violet', value: '#7c3aed' },
	{ name: 'Ink', value: '#191918' }
];

export const BACKGROUND_LABELS: Record<FormTheme['background'], string> = {
	plain: 'Plain',
	soft: 'Soft tint',
	gradient: 'Gradient',
	dark: 'Dark'
};
export const RADIUS_LABELS: Record<FormTheme['radius'], string> = {
	sm: 'Sharp',
	md: 'Rounded',
	lg: 'Pill'
};
export const FONT_LABELS: Record<FormTheme['font'], string> = {
	sans: 'Sans',
	serif: 'Serif',
	mono: 'Mono'
};
export const LAYOUT_LABELS: Record<FormTheme['layout'], string> = {
	single: 'Single page',
	steps: 'One section per step'
};
export const LOGO_SIZE_LABELS: Record<FormTheme['logoSize'], string> = {
	sm: 'Small',
	md: 'Medium',
	lg: 'Large'
};
/** Rendered logo height; the image keeps its aspect ratio and never exceeds LOGO_MAX_WIDTH. */
export const logoHeightClass: Record<FormTheme['logoSize'], string> = {
	sm: 'h-5',
	md: 'h-7',
	lg: 'h-10'
};
export const LOGO_MAX_WIDTH_CLASS = 'max-w-[180px]';
/** Server-side cap for logo previews, in pixels. */
export const LOGO_PREVIEW = { width: 720, height: 240 } as const;

const FILE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/;

function normalizeLogo(input: unknown): FormLogo | null {
	if (!input || typeof input !== 'object') return null;
	const l = input as Record<string, unknown>;
	if (typeof l.fileId !== 'string' || !FILE_ID.test(l.fileId)) return null;
	return { fileId: l.fileId, name: typeof l.name === 'string' ? l.name.slice(0, 120) : 'logo' };
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Coerce any stored or posted value into a valid theme, falling back to defaults per field. */
export function normalizeTheme(input: unknown): FormTheme {
	const t = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
	const pick = <T extends readonly string[]>(list: T, v: unknown, d: T[number]): T[number] =>
		typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T[number]) : d;
	return {
		accent:
			typeof t.accent === 'string' && HEX.test(t.accent)
				? t.accent.toLowerCase()
				: DEFAULT_THEME.accent,
		background: pick(THEME_BACKGROUNDS, t.background, DEFAULT_THEME.background),
		radius: pick(THEME_RADII, t.radius, DEFAULT_THEME.radius),
		font: pick(THEME_FONTS, t.font, DEFAULT_THEME.font),
		layout: pick(THEME_LAYOUTS, t.layout, DEFAULT_THEME.layout),
		submitLabel:
			(typeof t.submitLabel === 'string' ? t.submitLabel.trim().slice(0, 40) : '') ||
			DEFAULT_THEME.submitLabel,
		showBranding: t.showBranding !== false,
		logo: normalizeLogo(t.logo),
		logoSize: pick(THEME_LOGO_SIZES, t.logoSize, DEFAULT_THEME.logoSize)
	};
}

export function parseTheme(raw: string | null | undefined): FormTheme {
	if (!raw) return { ...DEFAULT_THEME };
	try {
		return normalizeTheme(JSON.parse(raw));
	} catch {
		return { ...DEFAULT_THEME };
	}
}

/** White or near-black, whichever reads better on the accent. */
export function accentForeground(hex: string): string {
	const n = parseInt(hex.slice(1), 16);
	const channel = (c: number) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	const l =
		0.2126 * channel((n >> 16) & 255) +
		0.7152 * channel((n >> 8) & 255) +
		0.0722 * channel(n & 255);
	return l > 0.45 ? '#191918' : '#ffffff';
}

const RADIUS_PX: Record<FormTheme['radius'], string> = { sm: '0.25rem', md: '0.5rem', lg: '1rem' };

/** CSS custom properties consumed by the `.fw-theme` rules in layout.css. */
export function themeVars(theme: FormTheme): string {
	return `--fw-accent:${theme.accent};--fw-accent-fg:${accentForeground(theme.accent)};--fw-radius:${RADIUS_PX[theme.radius]}`;
}

export function backgroundStyle(theme: FormTheme): string {
	const a = theme.accent;
	switch (theme.background) {
		case 'plain':
			return 'background:#f6f6f4';
		case 'soft':
			return `background:radial-gradient(70% 60% at 50% 0%, color-mix(in oklab, ${a} 16%, #f6f6f4), #f6f6f4 70%)`;
		case 'gradient':
			return `background:linear-gradient(135deg, ${a}, color-mix(in oklab, ${a} 55%, #191918))`;
		case 'dark':
			return 'background:#191918';
	}
}

export const isDarkBackground = (theme: FormTheme) =>
	theme.background === 'gradient' || theme.background === 'dark';

export const fontClass: Record<FormTheme['font'], string> = {
	sans: 'font-sans',
	serif: 'font-serif',
	mono: 'font-mono'
};
export const cardRadiusClass: Record<FormTheme['radius'], string> = {
	sm: 'rounded-md',
	md: 'rounded-2xl',
	lg: 'rounded-[1.75rem]'
};
export const buttonRadiusClass: Record<FormTheme['radius'], string> = {
	sm: 'rounded-md',
	md: 'rounded-lg',
	lg: 'rounded-full'
};

export interface FormStep {
	title: string | null;
	description: string | null;
	fields: FormField[];
}

/** Split fields into steps at each section marker. Fields before the first section form an intro step. */
export function splitSteps(fields: FormField[]): FormStep[] {
	const steps: FormStep[] = [];
	let current: FormStep = { title: null, description: null, fields: [] };
	for (const field of fields) {
		if (field.type === 'section') {
			if (current.fields.length > 0 || current.title) steps.push(current);
			current = { title: field.label, description: field.helpText ?? null, fields: [] };
		} else {
			current.fields.push(field);
		}
	}
	if (current.fields.length > 0 || current.title) steps.push(current);
	return steps.length > 0 ? steps : [{ title: null, description: null, fields: [] }];
}
