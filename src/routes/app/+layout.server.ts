import { Query } from 'node-appwrite';
import type { LayoutServerLoad } from './$types';
import { requireUser } from '$lib/server/auth';

export const load: LayoutServerLoad = async (event) => {
	const { appwrite } = requireUser(event);
	const teams = await appwrite.teams.list({ queries: [Query.orderAsc('name'), Query.limit(100)] });
	return {
		workspaces: teams.teams.map((t) => ({ id: t.$id, name: t.name, members: t.total }))
	};
};
