import { FIELD_TYPES, FIELD_TYPES_WITH_OPTIONS, type FormField, type FieldType } from '$lib/types';

const MAX_FIELDS = 60;
const MAX_OPTIONS = 50;
const MAX_LABEL = 200;
const MAX_TEXT = 5000;
const FIELD_ID = /^q_[a-z0-9]{4,24}$/;

export function newFieldId() {
	return `q_${Math.random().toString(36).slice(2, 10)}`;
}

function str(value: unknown, max: number): string {
	return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** Parse and sanitise the field definitions posted by the builder. Throws on malformed input. */
export function parseFields(raw: string): FormField[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error('Field definitions were not valid JSON');
	}
	if (!Array.isArray(parsed)) throw new Error('Field definitions must be a list');
	if (parsed.length > MAX_FIELDS) throw new Error(`A form can have at most ${MAX_FIELDS} fields`);

	const seen = new Set<string>();
	return parsed.map((item, index) => {
		const field = (item ?? {}) as Record<string, unknown>;
		const type = field.type as FieldType;
		if (!FIELD_TYPES.includes(type)) throw new Error(`Field ${index + 1} has an unknown type`);

		let id = typeof field.id === 'string' && FIELD_ID.test(field.id) ? field.id : newFieldId();
		while (seen.has(id)) id = newFieldId();
		seen.add(id);

		const label =
			str(field.label, MAX_LABEL) ||
			(type === 'section' ? `Section ${index + 1}` : `Question ${index + 1}`);
		const out: FormField = {
			id,
			type,
			label,
			required: type !== 'section' && field.required === true
		};
		const placeholder = str(field.placeholder, MAX_LABEL);
		const helpText = str(field.helpText, MAX_LABEL * 2);
		if (placeholder) out.placeholder = placeholder;
		if (helpText) out.helpText = helpText;

		if (FIELD_TYPES_WITH_OPTIONS.includes(type)) {
			const options = Array.isArray(field.options)
				? Array.from(
						new Set(field.options.map((o) => str(o, MAX_LABEL)).filter((o) => o.length > 0))
					).slice(0, MAX_OPTIONS)
				: [];
			if (options.length === 0) throw new Error(`"${label}" needs at least one option`);
			out.options = options;
		}
		return out;
	});
}

export interface FileLike {
	name: string;
	size: number;
	type: string;
	arrayBuffer(): Promise<ArrayBuffer>;
}

export type ParsedAnswer =
	{ kind: 'value'; value: string | string[] | null } | { kind: 'file'; file: FileLike | null };

export interface ValidationResult {
	answers: Record<string, ParsedAnswer>;
	errors: Record<string, string>;
	/** Text values to re-populate the form after a validation error (files are never echoed). */
	values: Record<string, string | string[]>;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validate a public submission against the form's fields. Files are returned for upload, not stored. */
export function validateSubmission(
	fields: FormField[],
	formData: globalThis.FormData,
	maxUploadBytes: number
): ValidationResult {
	const answers: Record<string, ParsedAnswer> = {};
	const errors: Record<string, string> = {};
	const values: Record<string, string | string[]> = {};

	for (const field of fields) {
		if (field.type === 'section') continue;
		const key = field.id;
		if (field.type === 'file') {
			const entry = formData.get(key);
			const file =
				entry && typeof entry !== 'string' && entry.size > 0 ? (entry as FileLike) : null;
			if (!file && field.required) errors[key] = 'Please attach a file';
			if (file && file.size > maxUploadBytes)
				errors[key] = `File must be smaller than ${Math.round(maxUploadBytes / 1024 / 1024)} MB`;
			answers[key] = { kind: 'file', file };
			continue;
		}

		if (field.type === 'checkbox') {
			const chosen = formData
				.getAll(key)
				.filter((v): v is string => typeof v === 'string')
				.filter((v) => field.options?.includes(v));
			if (field.required && chosen.length === 0) errors[key] = 'Choose at least one option';
			answers[key] = { kind: 'value', value: chosen };
			values[key] = chosen;
			continue;
		}

		const rawEntry = formData.get(key);
		const raw = typeof rawEntry === 'string' ? rawEntry.trim().slice(0, MAX_TEXT) : '';
		values[key] = raw;
		if (!raw) {
			if (field.required) errors[key] = 'This field is required';
			answers[key] = { kind: 'value', value: null };
			continue;
		}

		switch (field.type) {
			case 'email':
				if (!EMAIL.test(raw)) errors[key] = 'Enter a valid email address';
				break;
			case 'number':
				if (!Number.isFinite(Number(raw))) errors[key] = 'Enter a number';
				break;
			case 'date':
				if (Number.isNaN(Date.parse(raw))) errors[key] = 'Enter a valid date';
				break;
			case 'select':
			case 'radio':
				if (!field.options?.includes(raw)) errors[key] = 'Choose one of the listed options';
				break;
		}
		answers[key] = { kind: 'value', value: raw };
	}

	return { answers, errors, values };
}
