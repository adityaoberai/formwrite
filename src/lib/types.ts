import type { Models } from 'node-appwrite';

export const FIELD_TYPES = [
	'text',
	'textarea',
	'email',
	'number',
	'date',
	'select',
	'radio',
	'checkbox',
	'file',
	'section'
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
	text: 'Short text',
	textarea: 'Long text',
	email: 'Email',
	number: 'Number',
	date: 'Date',
	select: 'Dropdown',
	radio: 'Single choice',
	checkbox: 'Multiple choice',
	file: 'File upload',
	section: 'Section'
};

export const FIELD_TYPES_WITH_OPTIONS: readonly FieldType[] = ['select', 'radio', 'checkbox'];

/** Field types that collect an answer (everything except layout-only sections). */
export const isQuestion = (field: FormField) => field.type !== 'section';

export interface FormField {
	id: string;
	type: FieldType;
	label: string;
	placeholder?: string;
	helpText?: string;
	required: boolean;
	options?: string[];
}

export type FormStatus = 'draft' | 'published';

export const THEME_BACKGROUNDS = ['plain', 'soft', 'gradient', 'dark'] as const;
export const THEME_RADII = ['sm', 'md', 'lg'] as const;
export const THEME_FONTS = ['sans', 'serif', 'mono'] as const;
export const THEME_LAYOUTS = ['single', 'steps'] as const;

export interface FormTheme {
	/** Hex color, e.g. #4f46e5 */
	accent: string;
	background: (typeof THEME_BACKGROUNDS)[number];
	radius: (typeof THEME_RADII)[number];
	font: (typeof THEME_FONTS)[number];
	/** `steps` shows one section per page when the form has sections. */
	layout: (typeof THEME_LAYOUTS)[number];
	submitLabel: string;
	showBranding: boolean;
}

export const DEFAULT_THEME: FormTheme = {
	accent: '#4f46e5',
	background: 'soft',
	radius: 'md',
	font: 'sans',
	layout: 'single',
	submitLabel: 'Submit',
	showBranding: true
};

export interface FormData {
	title: string;
	description: string;
	status: FormStatus;
	fields: FormField[];
	successMessage: string;
	createdBy: string;
	theme?: FormTheme;
}
export type FormDocument = Models.Document & FormData;

export interface UploadedFile {
	fileId: string;
	name: string;
	size: number;
	mimeType: string;
}
export type AnswerValue = string | string[] | UploadedFile | null;

export interface SubmissionData {
	formId: string;
	answers: Record<string, AnswerValue>;
	userAgent: string;
}
export type SubmissionDocument = Models.Document & SubmissionData;

export const WORKSPACE_ROLES = ['owner', 'editor', 'viewer'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const ROLE_DESCRIPTIONS: Record<WorkspaceRole, string> = {
	owner: 'Manage members, settings, forms and responses',
	editor: 'Create and edit forms, manage responses',
	viewer: 'View forms and responses'
};

export function isUploadedFile(value: AnswerValue): value is UploadedFile {
	return typeof value === 'object' && value !== null && !Array.isArray(value) && 'fileId' in value;
}
