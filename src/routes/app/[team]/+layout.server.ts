import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { createAdminClient } from '$lib/server/appwrite';
import { requireUser } from '$lib/server/auth';
import { canEdit, canManage, loadWorkspace } from '$lib/server/tenant';

export const load: LayoutServerLoad = async (event) => {
	const { user, appwrite } = requireUser(event);
	try {
		const { team, role } = await loadWorkspace(
			appwrite,
			createAdminClient(),
			user.$id,
			event.params.team
		);
		return {
			workspace: { id: team.$id, name: team.name, members: team.total },
			role,
			canEdit: canEdit(role),
			canManage: canManage(role)
		};
	} catch {
		error(404, 'Workspace not found');
	}
};
