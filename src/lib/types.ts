import type { Models } from 'node-appwrite';

export const FIELD_TYPES = [
	'text',
	'textarea',
	'email',
	'phone',
	'url',
	'number',
	'radio',
	'checkbox',
	'select',
	'yes_no',
	'rating',
	'date',
	'file',
	'section',
	'paragraph'
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
	text: 'Short text',
	textarea: 'Long text',
	email: 'Email',
	phone: 'Phone',
	url: 'Website',
	number: 'Number',
	radio: 'Single choice',
	checkbox: 'Multiple choice',
	select: 'Dropdown',
	yes_no: 'Yes / No',
	rating: 'Rating',
	date: 'Date',
	file: 'File upload',
	section: 'Section',
	paragraph: 'Paragraph'
};

export type FieldGroup = 'Text' | 'Choice' | 'Special' | 'Layout';
export const FIELD_GROUPS: readonly FieldGroup[] = ['Text', 'Choice', 'Special', 'Layout'];

export interface FieldTypeMeta {
	type: FieldType;
	label: string;
	description: string;
	group: FieldGroup;
}

/** Palette metadata for the builder, in display order. */
export const FIELD_TYPE_META: readonly FieldTypeMeta[] = [
	{ type: 'text', label: 'Short text', description: 'Single line answer', group: 'Text' },
	{ type: 'textarea', label: 'Long text', description: 'Multi-line paragraph', group: 'Text' },
	{ type: 'email', label: 'Email', description: 'Validated email address', group: 'Text' },
	{ type: 'phone', label: 'Phone', description: 'Phone number', group: 'Text' },
	{ type: 'url', label: 'Website', description: 'A link, validated', group: 'Text' },
	{ type: 'number', label: 'Number', description: 'Numeric answer', group: 'Text' },
	{ type: 'radio', label: 'Single choice', description: 'Pick one option', group: 'Choice' },
	{
		type: 'checkbox',
		label: 'Multiple choice',
		description: 'Pick many options',
		group: 'Choice'
	},
	{ type: 'select', label: 'Dropdown', description: 'Compact select menu', group: 'Choice' },
	{ type: 'yes_no', label: 'Yes / No', description: 'A simple decision', group: 'Choice' },
	{ type: 'rating', label: 'Rating', description: 'Stars from 1 to N', group: 'Special' },
	{ type: 'date', label: 'Date', description: 'Calendar date picker', group: 'Special' },
	{ type: 'file', label: 'File upload', description: 'Kept with the response', group: 'Special' },
	{
		type: 'section',
		label: 'Section',
		description: 'Title that groups the questions after it',
		group: 'Layout'
	},
	{ type: 'paragraph', label: 'Paragraph', description: 'Helper text block', group: 'Layout' }
];

export const FIELD_TYPES_WITH_OPTIONS: readonly FieldType[] = ['select', 'radio', 'checkbox'];
export const FIELD_TYPES_WITH_PLACEHOLDER: readonly FieldType[] = [
	'text',
	'textarea',
	'email',
	'phone',
	'url',
	'number',
	'select'
];
export const RATING_SCALES = [3, 5, 7, 10] as const;

/** Layout-only field types that never collect an answer. */
export const isLayoutType = (type: FieldType) => type === 'section' || type === 'paragraph';
/** Field types that collect an answer. */
export const isQuestion = (field: FormField) => !isLayoutType(field.type);

export interface FormField {
	id: string;
	type: FieldType;
	label: string;
	placeholder?: string;
	helpText?: string;
	required: boolean;
	options?: string[];
	/** Rating scale (number of stars). */
	max?: number;
}

export type FormStatus = 'draft' | 'published';

export const THEME_BACKGROUNDS = ['plain', 'soft', 'gradient', 'dark'] as const;
export const THEME_RADII = ['sm', 'md', 'lg'] as const;
export const THEME_FONTS = ['sans', 'serif', 'mono'] as const;
export const THEME_LAYOUTS = ['single', 'steps'] as const;
export const THEME_LOGO_SIZES = ['sm', 'md', 'lg'] as const;

export interface FormLogo {
	fileId: string;
	name: string;
}

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
	/** Uploaded logo stored in the workspace bucket, shown above the form title. */
	logo: FormLogo | null;
	logoSize: (typeof THEME_LOGO_SIZES)[number];
}

export const DEFAULT_THEME: FormTheme = {
	accent: '#4f46e5',
	background: 'soft',
	radius: 'md',
	font: 'sans',
	layout: 'single',
	submitLabel: 'Submit',
	showBranding: true,
	logo: null,
	logoSize: 'md'
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

export const SUBMISSION_STATUSES = ['new', 'read', 'flagged'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export function isSubmissionStatus(value: unknown): value is SubmissionStatus {
	return typeof value === 'string' && (SUBMISSION_STATUSES as readonly string[]).includes(value);
}

export interface SubmissionData {
	formId: string;
	answers: Record<string, AnswerValue>;
	userAgent: string;
	/** Triage state set by workspace members. Responses without one are treated as new. */
	status?: SubmissionStatus;
	/** True when the response came through an embedded form. */
	embed?: boolean;
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
