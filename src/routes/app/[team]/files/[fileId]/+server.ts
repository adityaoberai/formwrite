import type { RequestHandler } from './$types';
import { requireUser } from '$lib/server/auth';
import { notFoundOnFailure } from '$lib/server/errors';
import { bucketId } from '$lib/server/tenant';

/**
 * Streams an uploaded file to a workspace member. The request is made with the member's session,
 * so Appwrite's bucket permissions (read: team members only) decide whether it is served.
 */
export const GET: RequestHandler = async (event) => {
	const { appwrite } = requireUser(event);
	const { team: teamId, fileId } = event.params;

	try {
		const meta = await appwrite.storage.getFile({ bucketId: bucketId(teamId), fileId });
		const bytes = await appwrite.storage.getFileView({ bucketId: bucketId(teamId), fileId });
		const safeName = meta.name.replace(/["\r\n]/g, '_');
		return new Response(bytes, {
			headers: {
				'content-type': meta.mimeType || 'application/octet-stream',
				'content-length': String(bytes.byteLength),
				'content-disposition': `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(meta.name)}`,
				'cache-control': 'private, max-age=300',
				'x-content-type-options': 'nosniff'
			}
		});
	} catch (err) {
		notFoundOnFailure(err, 'File not found');
	}
};
