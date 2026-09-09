import { fail } from '@sveltejs/kit';
import { Query } from 'node-appwrite';
import type { Actions, PageServerLoad } from './$types';
import { DATABASE_ID, createAdminClient } from '$lib/server/appwrite';
import { requireUser } from '$lib/server/auth';
import { describeError, notFoundOnFailure } from '$lib/server/errors';
import { bucketId, canEdit, loadWorkspace, submissionsCollection } from '$lib/server/tenant';
import { isSubmissionStatus, isUploadedFile, type SubmissionDocument } from '$lib/types';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async (event) => {
	const { appwrite } = requireUser(event);
	const { team: teamId, formId } = event.params;
	event.depends('app:form');

	const statusParam = event.url.searchParams.get('status');
	const status = isSubmissionStatus(statusParam) ? statusParam : null;
	const after = event.url.searchParams.get('after');

	try {
		const queries = [
			Query.equal('formId', formId),
			Query.orderDesc('$createdAt'),
			Query.limit(PAGE_SIZE)
		];
		if (status) queries.push(Query.equal('status', status));
		if (after) queries.push(Query.cursorAfter(after));

		const page = await appwrite.db.listDocuments<SubmissionDocument>({
			databaseId: DATABASE_ID,
			collectionId: submissionsCollection(teamId),
			queries
		});
		const last = page.documents.at(-1);
		return {
			submissions: page.documents.map((s) => ({
				id: s.$id,
				createdAt: s.$createdAt,
				answers: s.answers ?? {},
				userAgent: s.userAgent ?? '',
				status: isSubmissionStatus(s.status) ? s.status : ('new' as const),
				embed: s.embed === true
			})),
			total: page.total,
			nextCursor: page.documents.length === PAGE_SIZE && last ? last.$id : null,
			paged: !!after,
			statusFilter: status,
			fileBase: `/app/${teamId}/files`
		};
	} catch (err) {
		notFoundOnFailure(err, 'Form not found');
	}
};

export const actions: Actions = {
	delete: async (event) => {
		const { appwrite } = requireUser(event);
		const { team: teamId } = event.params;
		const data = await event.request.formData();
		const submissionId = String(data.get('id') ?? '');
		if (!submissionId) return fail(400, { message: 'Missing response' });

		try {
			const sub = await appwrite.db.getDocument<SubmissionDocument>({
				databaseId: DATABASE_ID,
				collectionId: submissionsCollection(teamId),
				documentId: submissionId
			});
			for (const value of Object.values(sub.answers ?? {})) {
				if (isUploadedFile(value)) {
					await appwrite.storage
						.deleteFile({ bucketId: bucketId(teamId), fileId: value.fileId })
						.catch(() => undefined);
				}
			}
			await appwrite.db.deleteDocument({
				databaseId: DATABASE_ID,
				collectionId: submissionsCollection(teamId),
				documentId: submissionId
			});
		} catch (err) {
			return fail(400, { message: describeError(err, 'Could not delete the response') });
		}
		return { deleted: submissionId };
	},

	/**
	 * Responses are written only by the server, so members have no update permission on them.
	 * Triage state is therefore stored with the API key after confirming the caller is an owner or
	 * editor of this workspace.
	 */
	status: async (event) => {
		const { user, appwrite } = requireUser(event);
		const { team: teamId, formId } = event.params;
		const data = await event.request.formData();
		const submissionId = String(data.get('id') ?? '');
		const status = data.get('status');
		if (!submissionId || !isSubmissionStatus(status)) {
			return fail(400, { message: 'Invalid request' });
		}

		const admin = createAdminClient();
		try {
			const workspace = await loadWorkspace(appwrite, admin, user.$id, teamId);
			if (!canEdit(workspace.role)) {
				return fail(403, { message: 'Your role cannot update responses' });
			}
			const sub = await admin.db.getDocument<SubmissionDocument>({
				databaseId: DATABASE_ID,
				collectionId: submissionsCollection(teamId),
				documentId: submissionId
			});
			if (sub.formId !== formId) return fail(404, { message: 'Response not found' });
			await admin.db.updateDocument({
				databaseId: DATABASE_ID,
				collectionId: submissionsCollection(teamId),
				documentId: submissionId,
				data: { status }
			});
		} catch (err) {
			return fail(400, { message: describeError(err, 'Could not update the response') });
		}
		return { updated: submissionId };
	}
};
