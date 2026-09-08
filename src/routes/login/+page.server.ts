import { fail, redirect } from '@sveltejs/kit';
import { ID } from 'node-appwrite';
import type { Actions, PageServerLoad } from './$types';
import { createAdminClient } from '$lib/server/appwrite';
import { safeNext, setPendingOtp } from '$lib/server/auth';
import { describeError } from '$lib/server/errors';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) redirect(303, safeNext(url.searchParams.get('next')));
	return { next: safeNext(url.searchParams.get('next')) };
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '')
			.trim()
			.toLowerCase();
		const next = safeNext(String(data.get('next') ?? url.searchParams.get('next') ?? ''));

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { email, message: 'Enter a valid email address' });
		}

		try {
			const { account } = createAdminClient();
			// Creates the account on first sign-in; otherwise the userId is ignored by Appwrite.
			const token = await account.createEmailToken({ userId: ID.unique(), email, phrase: true });
			setPendingOtp(cookies, {
				userId: token.userId,
				email,
				phrase: token.phrase,
				expire: token.expire
			});
		} catch (err) {
			return fail(400, { email, message: describeError(err, 'Could not send a code. Try again.') });
		}

		redirect(303, `/login/verify?next=${encodeURIComponent(next)}`);
	}
};
