import { error, fail } from '@sveltejs/kit';
import { ID } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import type { Actions, PageServerLoad } from './$types';
import { DATABASE_ID, createAdminClient } from '$lib/server/appwrite';
import { describeError, statusOf } from '$lib/server/errors';
import { validateSubmission } from '$lib/server/forms';
import { normalizeTheme } from '$lib/theme';
import {
	MAX_UPLOAD_BYTES,
	bucketId,
	formsCollection,
	submissionsCollection
} from '$lib/server/tenant';
import type { AnswerValue, FormDocument, SubmissionData, SubmissionDocument } from '$lib/types';

const TEAM_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/;

/**
 * Public forms are read with the API key because respondents are anonymous. The form is always
 * looked up inside the tenant's own collection, so a form ID can never resolve across tenants.
 */
async function loadPublishedForm(teamId: string, formId: string) {
	if (!TEAM_ID.test(teamId) || !TEAM_ID.test(formId)) error(404, 'Form not found');
	const admin = createAdminClient();
	let form: FormDocument;
	try {
		form = await admin.db.getDocument<FormDocument>({
			databaseId: DATABASE_ID,
			collectionId: formsCollection(teamId),
			documentId: formId
		});
	} catch (err) {
		const code = statusOf(err);
		if (code === 404) error(404, 'Form not found');
		error(code, describeError(err));
	}
	if (form.status !== 'published') error(404, 'This form is not accepting responses');
	return { admin, form };
}

export const load: PageServerLoad = async ({ params }) => {
	const { form } = await loadPublishedForm(params.team, params.formId);
	return {
		form: {
			title: form.title,
			description: form.description ?? '',
			fields: form.fields ?? [],
			successMessage: form.successMessage || 'Thanks! Your response has been recorded.',
			theme: normalizeTheme(form.theme)
		},
		logoUrl: `/f/${params.team}/${params.formId}/logo`
	};
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		const { admin, form } = await loadPublishedForm(params.team, params.formId);
		const fields = form.fields ?? [];
		const formData = await request.formData();
		const { answers, errors, values } = validateSubmission(fields, formData, MAX_UPLOAD_BYTES);

		if (Object.keys(errors).length > 0) {
			return fail(400, { errors, values, message: 'Please fix the highlighted fields.' });
		}

		const stored: Record<string, AnswerValue> = {};
		const uploaded: string[] = [];
		try {
			for (const [key, answer] of Object.entries(answers)) {
				if (answer.kind === 'value') {
					stored[key] = answer.value;
					continue;
				}
				if (!answer.file) {
					stored[key] = null;
					continue;
				}
				const bytes = new Uint8Array(await answer.file.arrayBuffer());
				const safeName = answer.file.name.replace(/[^\w.() -]+/g, '_').slice(0, 120) || 'upload';
				const file = await admin.storage.createFile({
					bucketId: bucketId(params.team),
					fileId: ID.unique(),
					file: InputFile.fromBuffer(bytes, safeName)
				});
				uploaded.push(file.$id);
				stored[key] = {
					fileId: file.$id,
					name: file.name,
					size: file.sizeOriginal,
					mimeType: file.mimeType
				};
			}

			const submission: SubmissionData = {
				formId: form.$id,
				answers: stored,
				userAgent: (request.headers.get('user-agent') ?? '').slice(0, 300)
			};
			await admin.db.createDocument<SubmissionDocument>({
				databaseId: DATABASE_ID,
				collectionId: submissionsCollection(params.team),
				documentId: ID.unique(),
				data: submission
			});
		} catch (err) {
			// Don't leave orphaned uploads behind if the submission itself failed.
			await Promise.all(
				uploaded.map((fileId) =>
					admin.storage
						.deleteFile({ bucketId: bucketId(params.team), fileId })
						.catch(() => undefined)
				)
			);
			return fail(500, {
				values,
				errors: {},
				message: describeError(err, 'We could not save your response. Please try again.')
			});
		}

		return { success: true };
	}
};
