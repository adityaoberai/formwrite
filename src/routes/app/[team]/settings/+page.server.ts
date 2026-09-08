import { fail, redirect } from '@sveltejs/kit';
import { Query } from 'node-appwrite';
import type { Actions, PageServerLoad } from './$types';
import { createAdminClient } from '$lib/server/appwrite';
import { requireUser } from '$lib/server/auth';
import { describeError, notFoundOnFailure } from '$lib/server/errors';
import {
	canManage,
	destroyWorkspace,
	isWorkspaceRole,
	loadWorkspace,
	roleOf
} from '$lib/server/tenant';

export const load: PageServerLoad = async (event) => {
	const { user, appwrite } = requireUser(event);
	const teamId = event.params.team;
	const admin = createAdminClient();
	try {
		// Membership is verified with the session; the full roster (with user IDs and emails) needs the key.
		await loadWorkspace(appwrite, admin, user.$id, teamId);
		const memberships = await admin.teams.listMemberships({
			teamId,
			queries: [Query.limit(100), Query.orderAsc('$createdAt')]
		});
		return {
			members: memberships.memberships.map((m) => ({
				id: m.$id,
				userId: m.userId,
				name: m.userName,
				email: m.userEmail,
				role: roleOf(m),
				joined: m.joined,
				isYou: m.userId === user.$id
			}))
		};
	} catch (err) {
		notFoundOnFailure(err, 'Workspace not found');
	}
};

/** Owner check enforced in-app before privileged (API key) operations. */
async function requireOwner(event: Parameters<Actions[string]>[0]) {
	const { user, appwrite } = requireUser(event);
	const workspace = await loadWorkspace(
		appwrite,
		createAdminClient(),
		user.$id,
		event.params.team
	).catch(() => null);
	if (!workspace || !canManage(workspace.role)) return null;
	return { user, appwrite, workspace };
}

export const actions: Actions = {
	rename: async (event) => {
		const { appwrite } = requireUser(event);
		const data = await event.request.formData();
		const name = String(data.get('name') ?? '')
			.trim()
			.slice(0, 80);
		if (name.length < 2) return fail(400, { rename: 'Give the workspace a name' });
		try {
			// Appwrite only lets team owners rename a team.
			await appwrite.teams.updateName({ teamId: event.params.team, name });
		} catch (err) {
			return fail(400, { rename: describeError(err, 'Could not rename the workspace') });
		}
		return { renamed: true };
	},

	invite: async (event) => {
		const ctx = await requireOwner(event);
		if (!ctx) return fail(403, { invite: 'Only owners can add members' });
		const data = await event.request.formData();
		const email = String(data.get('email') ?? '')
			.trim()
			.toLowerCase();
		const role = data.get('role');
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { invite: 'Enter a valid email address', email });
		}
		if (!isWorkspaceRole(role) || role === 'owner') {
			return fail(400, { invite: 'Choose a role of editor or viewer', email });
		}
		try {
			// Server-side membership creation joins the member immediately; they sign in with email OTP.
			await createAdminClient().teams.createMembership({
				teamId: event.params.team,
				email,
				roles: [role]
			});
		} catch (err) {
			return fail(400, { invite: describeError(err, 'Could not add that member'), email });
		}
		return { invited: email };
	},

	role: async (event) => {
		const { appwrite } = requireUser(event);
		const data = await event.request.formData();
		const membershipId = String(data.get('membershipId') ?? '');
		const role = data.get('role');
		if (!membershipId || !isWorkspaceRole(role)) return fail(400, { members: 'Invalid request' });
		try {
			// Appwrite only lets team owners change membership roles.
			await appwrite.teams.updateMembership({
				teamId: event.params.team,
				membershipId,
				roles: [role]
			});
		} catch (err) {
			return fail(400, { members: describeError(err, 'Could not update the role') });
		}
		return { updated: membershipId };
	},

	remove: async (event) => {
		const { user, appwrite } = requireUser(event);
		const data = await event.request.formData();
		const membershipId = String(data.get('membershipId') ?? '');
		const userId = String(data.get('userId') ?? '');
		if (!membershipId) return fail(400, { members: 'Invalid request' });
		try {
			// Owners can remove anyone; a member can always remove themselves (leave).
			await appwrite.teams.deleteMembership({ teamId: event.params.team, membershipId });
		} catch (err) {
			return fail(400, { members: describeError(err, 'Could not remove the member') });
		}
		if (userId === user.$id) redirect(303, '/app');
		return { removed: membershipId };
	},

	destroy: async (event) => {
		const ctx = await requireOwner(event);
		if (!ctx) return fail(403, { destroy: 'Only owners can delete a workspace' });
		const data = await event.request.formData();
		if (String(data.get('confirm') ?? '') !== ctx.workspace.team.name) {
			return fail(400, { destroy: 'Type the workspace name exactly to confirm' });
		}
		try {
			await destroyWorkspace(createAdminClient(), event.params.team);
		} catch (err) {
			return fail(400, { destroy: describeError(err, 'Could not delete the workspace') });
		}
		redirect(303, '/app');
	}
};
