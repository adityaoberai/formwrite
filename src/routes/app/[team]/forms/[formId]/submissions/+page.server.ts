import { fail } from '@sveltejs/kit';
import { Query } from 'node-appwrite';
import type { Actions, PageServerLoad } from './$types';
import { DATABASE_ID } from '$lib/server/appwrite';
import { requireUser } from '$lib/server/auth';
import { describeError, notFoundOnFailure } from '$lib/server/errors';
import { bucketId, formsCollection, submissionsCollection } from '$lib/server/tenant';
import { isQuestion, isUploadedFile, type FormDocument, type SubmissionDocument } from '$lib/types';

const PAGE_SIZE = 25;

export const load: PageServerLoad = async (event) => {
	const { appwrite } = requireUser(event);
	const { team: teamId, formId } = event.params;
	const after = event.url.searchParams.get('after');

	const startOfToday = new Date();
	startOfToday.setHours(0, 0, 0, 0);
	const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

	const count = (extra: string[]) =>
		appwrite.db
			.listDocuments({
				databaseId: DATABASE_ID,
				collectionId: submissionsCollection(teamId),
				queries: [Query.equal('formId', formId), ...extra, Query.limit(1), Query.select(['$id'])]
			})
			.then((r) => r.total)
			.catch(() => 0);

	try {
		const queries = [
			Query.equal('formId', formId),
			Query.orderDesc('$createdAt'),
			Query.limit(PAGE_SIZE)
		];
		if (after) queries.push(Query.cursorAfter(after));

		const [form, page, today, week] = await Promise.all([
			appwrite.db.getDocument<FormDocument>({
				databaseId: DATABASE_ID,
				collectionId: formsCollection(teamId),
				documentId: formId
			}),
			appwrite.db.listDocuments<SubmissionDocument>({
				databaseId: DATABASE_ID,
				collectionId: submissionsCollection(teamId),
				queries
			}),
			count([Query.greaterThan('$createdAt', startOfToday.toISOString())]),
			count([Query.greaterThan('$createdAt', weekAgo)])
		]);

		const last = page.documents.at(-1);
		return {
			form: {
				id: form.$id,
				title: form.title,
				status: form.status,
				fields: (form.fields ?? []).filter(isQuestion)
			},
			submissions: page.documents.map((s) => ({
				id: s.$id,
				createdAt: s.$createdAt,
				answers: s.answers ?? {},
				userAgent: s.userAgent ?? ''
			})),
			total: page.total,
			stats: { today, week },
			nextCursor: page.documents.length === PAGE_SIZE && last ? last.$id : null,
			paged: !!after
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
		const submissionId = String(data.get('submissionId') ?? '');
		if (!submissionId) return fail(400, { message: 'Missing submission' });

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
	}
};
