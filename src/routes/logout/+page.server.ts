import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { clearSessionCookie } from '$lib/server/auth';

export const load: PageServerLoad = async () => {
	redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ locals, cookies }) => {
		if (locals.appwrite) {
			await locals.appwrite.account.deleteSession({ sessionId: 'current' }).catch(() => undefined);
		}
		clearSessionCookie(cookies);
		redirect(303, '/');
	}
};
