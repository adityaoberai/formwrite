import { fail, redirect } from '@sveltejs/kit';
import { ID, Query } from 'node-appwrite';
import type { Actions, PageServerLoad } from './$types';
import { DATABASE_ID } from '$lib/server/appwrite';
import { requireUser } from '$lib/server/auth';
import { describeError, notFoundOnFailure } from '$lib/server/errors';
import { deleteFormCascade } from '$lib/server/forms';
import { formsCollection, submissionsCollection } from '$lib/server/tenant';
import { isQuestion, type FormData, type FormDocument } from '$lib/types';

export const load: PageServerLoad = async (event) => {
	const { appwrite } = requireUser(event);
	const teamId = event.params.team;
	const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

	const count = (queries: string[]) =>
		appwrite.db
			.listDocuments({
				databaseId: DATABASE_ID,
				collectionId: submissionsCollection(teamId),
				queries: [...queries, Query.limit(1), Query.select(['$id'])]
			})
			.then((r) => r.total)
			.catch(() => 0);

	try {
		const [list, totalResponses, weekResponses] = await Promise.all([
			appwrite.db.listDocuments<FormDocument>({
				databaseId: DATABASE_ID,
				collectionId: formsCollection(teamId),
				queries: [
					Query.select(['$id', '$createdAt', '$updatedAt', 'title', 'status', 'fields']),
					Query.orderDesc('$updatedAt'),
					Query.limit(100)
				]
			}),
			count([]),
			count([Query.greaterThan('$createdAt', weekAgo)])
		]);
		const counts = await Promise.all(
			list.documents.map((f) => count([Query.equal('formId', f.$id)]))
		);
		return {
			forms: list.documents.map((f, i) => ({
				id: f.$id,
				title: f.title,
				status: f.status,
				fieldCount: (f.fields ?? []).filter(isQuestion).length,
				submissions: counts[i],
				updatedAt: f.$updatedAt
			})),
			stats: {
				forms: list.total,
				published: list.documents.filter((f) => f.status === 'published').length,
				responses: totalResponses,
				week: weekResponses
			},
			origin: event.url.origin
		};
	} catch (err) {
		notFoundOnFailure(err, 'Workspace not found');
	}
};

export const actions: Actions = {
	create: async (event) => {
		const { user, appwrite } = requireUser(event);
		const teamId = event.params.team;
		const data = await event.request.formData();
		const title =
			String(data.get('title') ?? '')
				.trim()
				.slice(0, 200) || 'Untitled form';

		const doc: FormData = {
			title,
			description: '',
			status: 'draft',
			fields: [
				{ id: 'q_name', type: 'text', label: 'Your name', required: true },
				{ id: 'q_email', type: 'email', label: 'Email address', required: true }
			],
			successMessage: 'Thanks! Your response has been recorded.',
			createdBy: user.$id
		};

		let formId: string;
		try {
			const created = await appwrite.db.createDocument<FormDocument>({
				databaseId: DATABASE_ID,
				collectionId: formsCollection(teamId),
				documentId: ID.unique(),
				data: doc
			});
			formId = created.$id;
		} catch (err) {
			return fail(400, { message: describeError(err, 'Could not create the form') });
		}
		redirect(303, `/app/${teamId}/forms/${formId}`);
	},

	delete: async (event) => {
		const { appwrite } = requireUser(event);
		const teamId = event.params.team;
		const data = await event.request.formData();
		const formId = String(data.get('formId') ?? '');
		if (!formId) return fail(400, { message: 'Missing form' });

		try {
			await deleteFormCascade(appwrite, teamId, formId);
		} catch (err) {
			return fail(400, { message: describeError(err, 'Could not delete the form') });
		}
		return { deleted: formId };
	}
};
