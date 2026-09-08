import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createAdminClient } from '$lib/server/appwrite';
import { requireUser } from '$lib/server/auth';
import { describeError } from '$lib/server/errors';
import { provisionWorkspace } from '$lib/server/tenant';

export const load: PageServerLoad = async (event) => {
	requireUser(event);
	return {};
};

export const actions: Actions = {
	create: async (event) => {
		const { appwrite } = requireUser(event);
		const data = await event.request.formData();
		const name = String(data.get('name') ?? '')
			.trim()
			.slice(0, 80);
		if (name.length < 2) return fail(400, { name, message: 'Give the workspace a name' });

		let teamId: string;
		try {
			const team = await provisionWorkspace(appwrite, createAdminClient(), name);
			teamId = team.$id;
		} catch (err) {
			return fail(400, { name, message: describeError(err, 'Could not create the workspace') });
		}
		redirect(303, `/app/${teamId}`);
	}
};
