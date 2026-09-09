import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { DATABASE_ID } from '$lib/server/appwrite';
import { requireUser } from '$lib/server/auth';
import { describeError } from '$lib/server/errors';
import { parseFields } from '$lib/server/forms';
import { formsCollection } from '$lib/server/tenant';
import type { FormDocument } from '$lib/types';

export const actions: Actions = {
	/** Saves what the builder edits: title, description and fields. Design lives under Settings. */
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
		if (!title) return fail(400, { message: 'The form needs a title' });
		const raw = String(data.get('fields') ?? '[]');
		if (raw.length > 400_000) return fail(400, { message: 'This form is too large' });

		try {
			const fields = parseFields(raw);
			await appwrite.db.updateDocument<FormDocument>({
				databaseId: DATABASE_ID,
				collectionId: formsCollection(teamId),
				documentId: formId,
				data: { title, description, fields }
			});
		} catch (err) {
			return fail(400, { message: describeError(err, 'Could not save the form') });
		}
		return { saved: true };
	}
};
