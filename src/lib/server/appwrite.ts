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
 * Privileged client backed by the server API key. Bypasses permissions, so it is only used for
 * operations Appwrite cannot authorise on the user's behalf: sending OTP codes, exchanging them for
 * sessions, provisioning tenant resources, and accepting anonymous public form submissions.
 */
export function createAdminClient() {
	const client = baseClient().setKey(required('APPWRITE_API_KEY'));
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
