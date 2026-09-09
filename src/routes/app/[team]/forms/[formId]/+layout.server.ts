import { Query } from 'node-appwrite';
import type { LayoutServerLoad } from './$types';
import { DATABASE_ID } from '$lib/server/appwrite';
import { requireUser } from '$lib/server/auth';
import { notFoundOnFailure } from '$lib/server/errors';
import { formsCollection, submissionsCollection } from '$lib/server/tenant';
import { normalizeTheme } from '$lib/theme';
import type { FormDocument } from '$lib/types';

/** Loads the form once for every tab (Build, Share, Responses, Settings) and the shared header. */
export const load: LayoutServerLoad = async (event) => {
	const { appwrite } = requireUser(event);
	const { team: teamId, formId } = event.params;
	event.depends('app:form');

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
			responseCount: submissions.total,
			publicUrl: `${event.url.origin}/f/${teamId}/${formId}`,
			logoUrl: `/f/${teamId}/${formId}/logo`
		};
	} catch (err) {
		notFoundOnFailure(err, 'Form not found');
	}
};
