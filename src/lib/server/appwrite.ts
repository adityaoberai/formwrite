import { env } from '$env/dynamic/private';
import { Account, Client, DocumentsDB, Storage, Teams, Users } from 'node-appwrite';

function required(name: string): string {
	const value = env[name];
	if (!value) throw new Error(`Missing required environment variable ${name}`);
	return value;
}

export const ENDPOINT = required('APPWRITE_ENDPOINT');
export const PROJECT_ID = required('APPWRITE_PROJECT_ID');
export const DATABASE_ID = env.APPWRITE_DATABASE_ID || 'formwrite';

/** Cookie that carries the Appwrite session secret. Appwrite's SSR convention is a_session_<project>. */
export const SESSION_COOKIE = `a_session_${PROJECT_ID}`;

function baseClient(): Client {
	return new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
}

export type AdminServices = ReturnType<typeof createAdminClient>;
export type SessionServices = ReturnType<typeof createSessionClient>;

/**
 * Header on which Appwrite Sites delivers a dynamic API key to every SSR request. The key is minted
 * per request with the scopes configured on the site, so no long-lived secret has to be stored.
 */
export const DYNAMIC_KEY_HEADER = 'x-appwrite-key';

/**
 * Resolve the API key for the current request: the dynamic key injected by Appwrite Sites, or the
 * APPWRITE_API_KEY environment variable when running outside Appwrite (local dev, e2e scripts).
 */
export function apiKeyFor(request: Request): string {
	const dynamic = request.headers.get(DYNAMIC_KEY_HEADER);
	if (dynamic) return dynamic;
	const fallback = env.APPWRITE_API_KEY;
	if (fallback) return fallback;
	throw new Error(
		`No API key available: expected a ${DYNAMIC_KEY_HEADER} header from Appwrite Sites or an APPWRITE_API_KEY environment variable`
	);
}

/**
 * Privileged client backed by the request's API key. Bypasses permissions, so it is only used for
 * operations Appwrite cannot authorise on the user's behalf: sending OTP codes, exchanging them for
 * sessions, provisioning tenant resources, and accepting anonymous public form submissions.
 */
export function createAdminClient(request: Request) {
	const client = baseClient().setKey(apiKeyFor(request));
	return {
		client,
		account: new Account(client),
		teams: new Teams(client),
		users: new Users(client),
		db: new DocumentsDB(client),
		storage: new Storage(client)
	};
}

/**
 * Per-request client that acts as the signed-in user. Every tenant read and write in the dashboard
 * goes through this client so Appwrite's team permissions enforce isolation, not application code.
 */
export function createSessionClient(session: string, userAgent?: string | null) {
	const client = baseClient().setSession(session);
	if (userAgent) client.setForwardedUserAgent(userAgent);
	return {
		client,
		account: new Account(client),
		teams: new Teams(client),
		db: new DocumentsDB(client),
		storage: new Storage(client)
	};
}
