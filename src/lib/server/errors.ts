import { AppwriteException } from 'node-appwrite';
import { error } from '@sveltejs/kit';

/**
 * Product-facing message for a backend failure. Raw backend messages mention internal concepts
 * (collections, documents, sessions), so they are never shown to users. Known error types map to
 * specific guidance; everything else falls back to the caller's contextual message.
 */
export function describeError(err: unknown, fallback = 'Something went wrong. Please try again.') {
	if (err instanceof AppwriteException) {
		switch (err.type) {
			case 'user_invalid_token':
			case 'user_invalid_credentials':
				return 'That code is not valid or has expired. Request a new one and try again.';
			case 'user_blocked':
				return 'This account has been disabled. Contact support if you think this is a mistake.';
			case 'user_already_exists':
			case 'team_invite_already_exists':
				return 'That person is already a member of this workspace.';
			case 'general_rate_limit_exceeded':
				return 'Too many attempts. Please wait a moment and try again.';
		}
		switch (err.code) {
			case 401:
			case 403:
				return 'You do not have permission to do that.';
			case 404:
				return 'We could not find that. It may have been deleted.';
			case 409:
				return 'That already exists.';
			case 413:
				return 'That file is too large.';
			case 429:
				return 'Too many attempts. Please wait a moment and try again.';
		}
		return fallback;
	}
	if (err instanceof Error && !(err instanceof AppwriteException)) return err.message || fallback;
	return fallback;
}

export function statusOf(err: unknown): number {
	return err instanceof AppwriteException && err.code >= 400 ? err.code : 500;
}

/** Convert a backend lookup failure into an error page (404 for missing or forbidden resources). */
export function notFoundOnFailure(err: unknown, message = 'Not found'): never {
	const code = statusOf(err);
	if (code === 401 || code === 403 || code === 404) error(404, message);
	error(code, 'Something went wrong. Please try again.');
}
