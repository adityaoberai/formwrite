import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, createSessionClient } from '$lib/server/appwrite';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.appwrite = null;

	const session = event.cookies.get(SESSION_COOKIE);
	if (session) {
		const services = createSessionClient(session, event.request.headers.get('user-agent'));
		try {
			event.locals.user = await services.account.get();
			event.locals.appwrite = services;
		} catch {
			// Expired or revoked session: drop the cookie so the user is treated as a guest.
			event.cookies.delete(SESSION_COOKIE, { path: '/' });
		}
	}

	return resolve(event);
};
