import { error } from '@sveltejs/kit';
import { ImageFormat } from 'node-appwrite';
import type { RequestHandler } from './$types';
import { DATABASE_ID, createAdminClient } from '$lib/server/appwrite';
import { statusOf } from '$lib/server/errors';
import { bucketId, formsCollection } from '$lib/server/tenant';
import { LOGO_PREVIEW, normalizeTheme } from '$lib/theme';
import type { FormDocument } from '$lib/types';

const ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/;

/**
 * Serves a form's logo as a resized preview (never the original file), capped at LOGO_PREVIEW so a
 * large upload cannot blow up the page. Anyone can load it for a published form; for drafts only
 * workspace members can, which is what lets the editor preview show it before publishing.
 */
export const GET: RequestHandler = async ({ params, locals, setHeaders }) => {
	if (!ID.test(params.team) || !ID.test(params.formId)) error(404, 'Not found');
	const admin = createAdminClient();

	let form: FormDocument;
	try {
		form = await admin.db.getDocument<FormDocument>({
			databaseId: DATABASE_ID,
			collectionId: formsCollection(params.team),
			documentId: params.formId
		});
	} catch (err) {
		error(statusOf(err) === 404 ? 404 : 500, 'Not found');
	}
	const logo = normalizeTheme(form.theme).logo;
	if (!logo) error(404, 'Not found');

	const published = form.status === 'published';
	if (!published) {
		// A member's session can read files in the workspace bucket; anyone else cannot.
		const member = await locals.appwrite?.storage
			.getFile({ bucketId: bucketId(params.team), fileId: logo.fileId })
			.then(() => true)
			.catch(() => false);
		if (!member) error(404, 'Not found');
	}

	try {
		const bytes = await admin.storage.getFilePreview({
			bucketId: bucketId(params.team),
			fileId: logo.fileId,
			width: LOGO_PREVIEW.width,
			height: LOGO_PREVIEW.height,
			output: ImageFormat.Webp
		});
		setHeaders({
			'content-type': 'image/webp',
			'content-length': String(bytes.byteLength),
			'cache-control': published ? 'public, max-age=3600' : 'private, no-store',
			'x-content-type-options': 'nosniff',
			'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'"
		});
		return new Response(bytes);
	} catch {
		error(404, 'Not found');
	}
};
