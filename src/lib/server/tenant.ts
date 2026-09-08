import { DocumentsDBIndexType, ID, Permission, Query, Role, type Models } from 'node-appwrite';
import { DATABASE_ID, type AdminServices, type SessionServices } from '$lib/server/appwrite';
import { WORKSPACE_ROLES, type WorkspaceRole } from '$lib/types';

/**
 * Tenant isolation model
 * ----------------------
 * A workspace is an Appwrite Team. Every tenant owns:
 *   - its own `forms_<teamId>` collection in the DocumentsDB database
 *   - its own `submissions_<teamId>` collection in the DocumentsDB database
 *   - its own storage bucket whose ID is the team ID
 * Collection and bucket permissions are granted to Role.team(teamId[, role]) only, so Appwrite
 * refuses cross-tenant access for any request made with a user session. The API key is used only
 * for provisioning and for public (anonymous) form submissions, which are always addressed by
 * team ID + form ID and validated against that tenant's form definition.
 */
export const formsCollection = (teamId: string) => `forms_${teamId}`;
export const submissionsCollection = (teamId: string) => `submissions_${teamId}`;
export const bucketId = (teamId: string) => teamId;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export interface Workspace {
	team: Models.Team<Models.Preferences>;
	membership: Models.Membership;
	role: WorkspaceRole;
}

export function roleOf(membership: Models.Membership): WorkspaceRole {
	if (membership.roles.includes('owner')) return 'owner';
	if (membership.roles.includes('editor')) return 'editor';
	return 'viewer';
}

export const canEdit = (role: WorkspaceRole) => role === 'owner' || role === 'editor';
export const canManage = (role: WorkspaceRole) => role === 'owner';

export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
	return typeof value === 'string' && (WORKSPACE_ROLES as readonly string[]).includes(value);
}

/**
 * Resolve the workspace for the current user.
 *
 * Membership is proven with the user's session: `teams.get` only succeeds for team members, so a
 * non-member gets an Appwrite 401/404 which callers translate into a 404 page. Roles are then read
 * with the API key because Appwrite blanks out `userId` on session-scoped membership listings.
 */
export async function loadWorkspace(
	session: SessionServices,
	admin: AdminServices,
	userId: string,
	teamId: string
): Promise<Workspace> {
	const team = await session.teams.get({ teamId });
	const memberships = await admin.users.listMemberships({
		userId,
		queries: [Query.equal('teamId', teamId), Query.limit(1)]
	});
	const membership = memberships.memberships.find((m) => m.teamId === teamId);
	if (!membership || !membership.confirm) throw new Error('Not a member of this workspace');
	return { team, membership, role: roleOf(membership) };
}

/**
 * Create a workspace: the team is created with the user's session so they become its owner, then
 * the API key provisions the tenant's isolated collections and bucket. Any failure rolls back.
 */
export async function provisionWorkspace(
	session: SessionServices,
	admin: AdminServices,
	name: string
): Promise<Models.Team<Models.Preferences>> {
	const team = await session.teams.create({ teamId: ID.unique(), name, roles: ['owner'] });
	const teamId = team.$id;

	const members = Role.team(teamId);
	const owners = Role.team(teamId, 'owner');
	const editors = Role.team(teamId, 'editor');

	try {
		await admin.db.createCollection({
			databaseId: DATABASE_ID,
			collectionId: formsCollection(teamId),
			name: `Forms - ${name}`,
			documentSecurity: false,
			permissions: [
				Permission.read(members),
				Permission.create(owners),
				Permission.update(owners),
				Permission.delete(owners),
				Permission.create(editors),
				Permission.update(editors),
				Permission.delete(editors)
			]
		});
		await admin.db.createCollection({
			databaseId: DATABASE_ID,
			collectionId: submissionsCollection(teamId),
			name: `Submissions - ${name}`,
			documentSecurity: false,
			// Submissions are created only by the server on behalf of anonymous respondents.
			permissions: [Permission.read(members), Permission.delete(owners), Permission.delete(editors)]
		});
		await admin.db.createIndex({
			databaseId: DATABASE_ID,
			collectionId: submissionsCollection(teamId),
			key: 'idx_form',
			type: DocumentsDBIndexType.Key,
			attributes: ['formId']
		});
		await admin.storage.createBucket({
			bucketId: bucketId(teamId),
			name: `Uploads - ${name}`,
			fileSecurity: false,
			permissions: [
				Permission.read(members),
				Permission.delete(owners),
				Permission.delete(editors)
			],
			maximumFileSize: MAX_UPLOAD_BYTES,
			encryption: true,
			antivirus: true
		});
	} catch (err) {
		await destroyWorkspace(admin, teamId).catch(() => undefined);
		throw err;
	}

	return team;
}

/** Remove every resource that belongs to a tenant. Safe to call on partially provisioned tenants. */
export async function destroyWorkspace(admin: AdminServices, teamId: string) {
	const ignoreMissing = (p: Promise<unknown>) =>
		p.catch((err: { code?: number }) => {
			if (err?.code === 404) return;
			throw err;
		});
	await Promise.all([
		ignoreMissing(
			admin.db.deleteCollection({ databaseId: DATABASE_ID, collectionId: formsCollection(teamId) })
		),
		ignoreMissing(
			admin.db.deleteCollection({
				databaseId: DATABASE_ID,
				collectionId: submissionsCollection(teamId)
			})
		),
		ignoreMissing(admin.storage.deleteBucket({ bucketId: bucketId(teamId) }))
	]);
	await ignoreMissing(admin.teams.delete({ teamId }));
}
