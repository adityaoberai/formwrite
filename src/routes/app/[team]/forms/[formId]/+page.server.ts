import { fail } from '@sveltejs/kit';
import { ID, Query } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import type { Actions, PageServerLoad } from './$types';
import { DATABASE_ID, createAdminClient } from '$lib/server/appwrite';
import { requireUser } from '$lib/server/auth';
import { describeError, notFoundOnFailure } from '$lib/server/errors';
import { parseFields } from '$lib/server/forms';
import { normalizeTheme, parseTheme } from '$lib/theme';
import { bucketId, formsCollection, submissionsCollection } from '$lib/server/tenant';
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
			publicUrl: `${event.url.origin}/f/${teamId}/${formId}`,
			logoUrl: `/f/${teamId}/${formId}/logo`
		};
	} catch (err) {
		notFoundOnFailure(err, 'Form not found');
	}
};

const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export const actions: Actions = {
	/**
	 * Upload a logo into the workspace bucket and attach it to the form. The file is written with
	 * the API key (users cannot create files directly) but the form update runs with the user's
	 * session, so only owners and editors succeed; on failure the upload is rolled back.
	 */
	logo: async (event) => {
		const { appwrite } = requireUser(event);
		const { team: teamId, formId } = event.params;
		const data = await event.request.formData();
		const file = data.get('logo');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { logoError: 'Choose an image to upload' });
		}
		if (!LOGO_TYPES.has(file.type)) {
			return fail(400, { logoError: 'Use a PNG, JPG, WebP, GIF or SVG image' });
		}
		if (file.size > MAX_LOGO_BYTES) {
			return fail(400, { logoError: 'Logos must be smaller than 2 MB' });
		}

		let form: FormDocument;
		try {
			form = await appwrite.db.getDocument<FormDocument>({
				databaseId: DATABASE_ID,
				collectionId: formsCollection(teamId),
				documentId: formId
			});
		} catch (err) {
			return fail(400, { logoError: describeError(err, 'Could not load the form') });
		}
		const theme = normalizeTheme(form.theme);
		const previous = theme.logo;

		const admin = createAdminClient();
		const safeName = file.name.replace(/[^\w.() -]+/g, '_').slice(0, 120) || 'logo';
		let uploaded;
		try {
			uploaded = await admin.storage.createFile({
				bucketId: bucketId(teamId),
				fileId: ID.unique(),
				file: InputFile.fromBuffer(new Uint8Array(await file.arrayBuffer()), safeName)
			});
		} catch (err) {
			return fail(400, { logoError: describeError(err, 'Could not upload the logo') });
		}
		const logo = { fileId: uploaded.$id, name: uploaded.name };

		try {
			await appwrite.db.updateDocument<FormDocument>({
				databaseId: DATABASE_ID,
				collectionId: formsCollection(teamId),
				documentId: formId,
				data: { theme: { ...theme, logo } }
			});
		} catch (err) {
			await admin.storage
				.deleteFile({ bucketId: bucketId(teamId), fileId: uploaded.$id })
				.catch(() => undefined);
			return fail(400, { logoError: describeError(err, 'Could not save the logo') });
		}
		if (previous && previous.fileId !== logo.fileId) {
			await admin.storage
				.deleteFile({ bucketId: bucketId(teamId), fileId: previous.fileId })
				.catch(() => undefined);
		}
		return { logo };
	},

	removeLogo: async (event) => {
		const { appwrite } = requireUser(event);
		const { team: teamId, formId } = event.params;
		try {
			const form = await appwrite.db.getDocument<FormDocument>({
				databaseId: DATABASE_ID,
				collectionId: formsCollection(teamId),
				documentId: formId
			});
			const theme = normalizeTheme(form.theme);
			await appwrite.db.updateDocument<FormDocument>({
				databaseId: DATABASE_ID,
				collectionId: formsCollection(teamId),
				documentId: formId,
				data: { theme: { ...theme, logo: null } }
			});
			if (theme.logo) {
				await createAdminClient()
					.storage.deleteFile({ bucketId: bucketId(teamId), fileId: theme.logo.fileId })
					.catch(() => undefined);
			}
		} catch (err) {
			return fail(400, { logoError: describeError(err, 'Could not remove the logo') });
		}
		return { logoRemoved: true };
	},

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
