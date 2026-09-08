import { fail } from '@sveltejs/kit';
import { Query } from 'node-appwrite';
import type { Actions, PageServerLoad } from './$types';
import { DATABASE_ID } from '$lib/server/appwrite';
import { requireUser } from '$lib/server/auth';
import { describeError, notFoundOnFailure } from '$lib/server/errors';
import { parseFields } from '$lib/server/forms';
import { normalizeTheme, parseTheme } from '$lib/theme';
import { formsCollection, submissionsCollection } from '$lib/server/tenant';
import type { FormDocument } from '$lib/types';

export const load: PageServerLoad = async (event) => {
	const { appwrite } = requireUser(event);
	const { team: teamId, formId } = event.params;

	try {
		const [form, submissions] = await Promise.all([
			appwrite.db.getDocument<FormDocument>({
				databaseId: DATABASE_ID,
				collectionId: formsCollection(teamId),
				documentId: formId
			}),
			appwrite.db.listDocuments({
				databaseId: DATABASE_ID,
				collectionId: submissionsCollection(teamId),
				queries: [Query.equal('formId', formId), Query.limit(1), Query.select(['$id'])]
			})
		]);
		return {
			form: {
				id: form.$id,
				title: form.title,
				description: form.description ?? '',
				status: form.status,
				fields: form.fields ?? [],
				successMessage: form.successMessage ?? '',
				theme: normalizeTheme(form.theme),
				updatedAt: form.$updatedAt
			},
			submissionCount: submissions.total,
			publicUrl: `${event.url.origin}/f/${teamId}/${formId}`
		};
	} catch (err) {
		notFoundOnFailure(err, 'Form not found');
	}
};

export const actions: Actions = {
	save: async (event) => {
		const { appwrite } = requireUser(event);
		const { team: teamId, formId } = event.params;
		const data = await event.request.formData();

		const title = String(data.get('title') ?? '')
			.trim()
			.slice(0, 200);
		const description = String(data.get('description') ?? '')
			.trim()
			.slice(0, 2000);
		const successMessage = String(data.get('successMessage') ?? '')
			.trim()
			.slice(0, 500);
		if (!title) return fail(400, { message: 'The form needs a title' });

		try {
			const fields = parseFields(String(data.get('fields') ?? '[]'));
			const theme = parseTheme(String(data.get('theme') ?? ''));
			await appwrite.db.updateDocument<FormDocument>({
				databaseId: DATABASE_ID,
				collectionId: formsCollection(teamId),
				documentId: formId,
				data: { title, description, successMessage, fields, theme }
			});
		} catch (err) {
			return fail(400, { message: describeError(err, 'Could not save the form') });
		}
		return { saved: true };
	},

	publish: async (event) => {
		const { appwrite } = requireUser(event);
		const { team: teamId, formId } = event.params;
		const data = await event.request.formData();
		const status = data.get('status') === 'published' ? 'published' : 'draft';

		try {
			await appwrite.db.updateDocument<FormDocument>({
				databaseId: DATABASE_ID,
				collectionId: formsCollection(teamId),
				documentId: formId,
				data: { status }
			});
		} catch (err) {
			return fail(400, { message: describeError(err, 'Could not change the form status') });
		}
		return { saved: true };
	}
};
