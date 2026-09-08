import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createAdminClient } from '$lib/server/appwrite';
import { clearPendingOtp, readPendingOtp, safeNext, setSessionCookie } from '$lib/server/auth';
import { describeError } from '$lib/server/errors';

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const next = safeNext(url.searchParams.get('next'));
	if (locals.user) redirect(303, next);
	const pending = readPendingOtp(cookies);
	if (!pending) redirect(303, `/login?next=${encodeURIComponent(next)}`);
	return { email: pending.email, phrase: pending.phrase, next };
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const next = safeNext(url.searchParams.get('next'));
		const pending = readPendingOtp(cookies);
		if (!pending) redirect(303, `/login?next=${encodeURIComponent(next)}`);

		const data = await request.formData();
		const code = String(data.get('code') ?? '').replace(/\s+/g, '');
		if (!/^\d{6}$/.test(code)) {
			return fail(400, { message: 'Enter the 6-digit code from the email' });
		}

		try {
			const { account } = createAdminClient();
			const session = await account.createSession({ userId: pending.userId, secret: code });
			setSessionCookie(cookies, session);
			clearPendingOtp(cookies);
		} catch (err) {
			return fail(400, { message: describeError(err, 'That code was not accepted. Try again.') });
		}

		redirect(303, next);
	}
};
