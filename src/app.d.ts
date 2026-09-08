import type { Models } from 'node-appwrite';
import type { SessionServices } from '$lib/server/appwrite';

declare global {
	namespace App {
		interface Locals {
			/** Signed-in Appwrite user, or null for guests. */
			user: Models.User<Models.Preferences> | null;
			/** Appwrite services bound to the current user's session, or null for guests. */
			appwrite: SessionServices | null;
		}
		interface PageData {
			user?: Pick<Models.User<Models.Preferences>, '$id' | 'name' | 'email'> | null;
		}
		// interface Error {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
