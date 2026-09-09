import type { IconName } from '$lib/components/Icon.svelte';
import {
	FIELD_TYPE_LABELS,
	FIELD_TYPE_META,
	FIELD_TYPES_WITH_OPTIONS,
	isUploadedFile,
	type AnswerValue,
	type FieldType,
	type FieldTypeMeta,
	type FormField
} from '$lib/types';

/** Client-safe helpers shared by the builder, the public form and the responses views. */

export const FIELD_ICONS: Record<FieldType, IconName> = {
	text: 'type',
	textarea: 'align-left',
	email: 'mail',
	phone: 'phone',
	url: 'link',
	number: 'hash',
	radio: 'circle-dot',
	checkbox: 'check-square',
	select: 'dropdown',
	yes_no: 'toggle',
	rating: 'star',
	date: 'calendar',
	file: 'upload',
	section: 'heading',
	paragraph: 'text'
};

const META = new Map(FIELD_TYPE_META.map((m) => [m.type, m]));
export function fieldMeta(type: FieldType): FieldTypeMeta {
	return META.get(type) ?? FIELD_TYPE_META[0];
}

export function newFieldId() {
	return `q_${Math.random().toString(36).slice(2, 10)}`;
}

/** A sensible starting point for a field of the given type. */
export function newField(type: FieldType): FormField {
	const base: FormField = { id: newFieldId(), type, label: 'Untitled question', required: false };
	switch (type) {
		case 'text':
		case 'textarea':
			return { ...base, placeholder: 'Type your answer' };
		case 'email':
			return { ...base, label: 'Email address', placeholder: 'name@example.com' };
		case 'phone':
			return { ...base, label: 'Phone number', placeholder: '+1 555 000 0000' };
		case 'url':
			return { ...base, label: 'Website', placeholder: 'https://' };
		case 'number':
			return { ...base, placeholder: '0' };
		case 'radio':
		case 'checkbox':
		case 'select':
			return { ...base, options: ['Option 1', 'Option 2', 'Option 3'] };
		case 'yes_no':
			return { ...base, label: 'Do you agree?' };
		case 'rating':
			return { ...base, label: 'How would you rate it?', max: 5 };
		case 'date':
			return { ...base, label: 'Pick a date' };
		case 'file':
			return { ...base, label: 'Upload a file' };
		case 'section':
			return { ...base, label: 'Section title' };
		case 'paragraph':
			return {
				...base,
				label: 'Add some helpful context for the people filling out this form.'
			};
	}
}

/** One-line description of a field shown under its label on the builder canvas. */
export function fieldSummary(field: FormField): string {
	if (FIELD_TYPES_WITH_OPTIONS.includes(field.type)) {
		const n = field.options?.length ?? 0;
		return `${n} option${n === 1 ? '' : 's'}`;
	}
	if (field.type === 'rating') return `1 to ${field.max ?? 5}`;
	return FIELD_TYPE_LABELS[field.type];
}

/** Human-readable rendering of a stored answer for tables, detail views and CSV. */
export function formatAnswer(field: FormField | undefined, value: AnswerValue | undefined): string {
	if (value === null || value === undefined) return '';
	if (Array.isArray(value)) return value.join(', ');
	if (isUploadedFile(value)) return value.name;
	if (field?.type === 'rating' && value !== '') return `${value} / ${field.max ?? 5}`;
	return value;
}
