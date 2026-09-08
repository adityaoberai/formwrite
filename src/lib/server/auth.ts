import { redirect, type Cookies, type RequestEvent } from '@sveltejs/kit';
import type { Models } from 'node-appwrite';
import { SESSION_COOKIE, type SessionServices } from '$lib/server/appwrite';

/** Short-lived cookie that carries the pending OTP challenge between /login and /login/verify. */
export const OTP_COOKIE = 'fw_otp';

export interface PendingOtp {
	userId: string;
	email: string;
	phrase: string;
	expire: string;
}

const secureCookies = process.env.NODE_ENV === 'production';

export function setPendingOtp(cookies: Cookies, pending: PendingOtp) {
	cookies.set(OTP_COOKIE, JSON.stringify(pending), {
		path: '/login',
		httpOnly: true,
		sameSite: 'lax',
		secure: secureCookies,
		expires: new Date(pending.expire)
	});
}

export function readPendingOtp(cookies: Cookies): PendingOtp | null {
	const raw = cookies.get(OTP_COOKIE);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as PendingOtp;
		if (!parsed.userId || !parsed.email) return null;
		return parsed;
	} catch {
		return null;
	}
}

export function clearPendingOtp(cookies: Cookies) {
	cookies.delete(OTP_COOKIE, { path: '/login' });
}

export function setSessionCookie(cookies: Cookies, session: Models.Session) {
	cookies.set(SESSION_COOKIE, session.secret, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: secureCookies,
		expires: new Date(session.expire)
	});
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

/** Ensure a signed-in user; otherwise send to /login remembering where they were going. */
export function requireUser(event: RequestEvent): {
	user: Models.User<Models.Preferences>;
	appwrite: SessionServices;
} {
	const { user, appwrite } = event.locals;
	if (!user || !appwrite) {
		const next = event.url.pathname + event.url.search;
		redirect(303, `/login?next=${encodeURIComponent(next)}`);
	}
	return { user, appwrite };
}

/** Only allow relative in-app redirect targets. */
export function safeNext(value: string | null | undefined, fallback = '/app') {
	if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
	return value;
}
