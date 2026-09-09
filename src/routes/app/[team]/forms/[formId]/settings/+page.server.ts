import { fail, redirect } from '@sveltejs/kit';
import { ID } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import type { Actions } from './$types';
import { DATABASE_ID, createAdminClient } from '$lib/server/appwrite';
import { requireUser } from '$lib/server/auth';
import { describeError } from '$lib/server/errors';
import { deleteFormCascade } from '$lib/server/forms';
import { bucketId, formsCollection } from '$lib/server/tenant';
import { normalizeTheme, parseTheme } from '$lib/theme';
import type { FormDocument, FormStatus } from '$lib/types';

const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

type ActionEvent = Parameters<NonNullable<Actions['publish']>>[0];

async function setStatus(event: ActionEvent, status: FormStatus) {
	const { appwrite } = requireUser(event);
	const { team: teamId, formId } = event.params;
	try {
		await appwrite.db.updateDocument<FormDocument>({
			databaseId: DATABASE_ID,
			collectionId: formsCollection(teamId),
			documentId: formId,
			data: { status }
		});
	} catch (err) {
		return fail(400, {
			section: 'status',
			message: describeError(err, 'Could not change the form status')
		});
	}
	return { section: 'status', saved: true };
}

export const actions: Actions = {
	publish: (event) => setStatus(event, 'published'),
	unpublish: (event) => setStatus(event, 'draft'),

	/** Theme and the message shown after submitting. The builder saves everything else. */
	design: async (event) => {
		const { appwrite } = requireUser(event);
		const { team: teamId, formId } = event.params;
		const data = await event.request.formData();
		const successMessage =
			String(data.get('successMessage') ?? '')
				.trim()
				.slice(0, 500) || 'Thanks! Your response has been recorded.';

		try {
			const posted = parseTheme(String(data.get('theme') ?? ''));
			// The logo is persisted by its own action, so the stored value always wins.
			const current = await appwrite.db.getDocument<FormDocument>({
				databaseId: DATABASE_ID,
				collectionId: formsCollection(teamId),
				documentId: formId
			});
			const theme = { ...posted, logo: normalizeTheme(current.theme).logo };
			await appwrite.db.updateDocument<FormDocument>({
				databaseId: DATABASE_ID,
				collectionId: formsCollection(teamId),
				documentId: formId,
				data: { theme, successMessage }
			});
		} catch (err) {
			return fail(400, {
				section: 'design',
				message: describeError(err, 'Could not save the design')
			});
		}
		return { section: 'design', saved: true };
	},

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

	delete: async (event) => {
		const { appwrite } = requireUser(event);
		const { team: teamId, formId } = event.params;
		const data = await event.request.formData();
		const confirm = String(data.get('confirm') ?? '').trim();

		try {
			const form = await appwrite.db.getDocument<FormDocument>({
				databaseId: DATABASE_ID,
				collectionId: formsCollection(teamId),
				documentId: formId
			});
			if (confirm !== form.title) {
				return fail(400, {
					section: 'delete',
					message: 'Type the form title exactly to confirm'
				});
			}
			await deleteFormCascade(appwrite, teamId, formId);
		} catch (err) {
			return fail(400, {
				section: 'delete',
				message: describeError(err, 'Could not delete the form')
			});
		}
		redirect(303, `/app/${teamId}`);
	}
};
