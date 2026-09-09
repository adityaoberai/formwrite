// End-to-end smoke test against the running dev server. Uses the API key to mint a session for a
// throwaway user (Users.createSession), then drives the SSR routes exactly like a browser would.
import { Client, Users, ID, Teams, DocumentsDB, Storage } from 'node-appwrite';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
	readFileSync(new URL('../.env', import.meta.url), 'utf8')
		.split('\n')
		.filter(Boolean)
		.map((l) => {
			const i = l.indexOf('=');
			return [l.slice(0, i), l.slice(i + 1)];
		})
);
const BASE = process.env.BASE ?? 'http://localhost:5173';
const admin = new Client()
	.setEndpoint(env.APPWRITE_ENDPOINT)
	.setProject(env.APPWRITE_PROJECT_ID)
	.setKey(env.APPWRITE_API_KEY);
const users = new Users(admin);
const teamsAdmin = new Teams(admin);
const dbAdmin = new DocumentsDB(admin);
const storageAdmin = new Storage(admin);

let failures = 0;
const ok = (cond, label, extra = '') => {
	console.log(`${cond ? 'PASS' : 'FAIL'} ${label}${extra ? ' ' + extra : ''}`);
	if (!cond) failures++;
};

const cookieName = `a_session_${env.APPWRITE_PROJECT_ID}`;

async function mintUser(tag) {
	const email = `formwrite-e2e-${tag}-${Date.now()}@example.com`;
	const user = await users.create({ userId: ID.unique(), email, name: `E2E ${tag}` });
	const session = await users.createSession({ userId: user.$id });
	return { user, cookie: `${cookieName}=${session.secret}` };
}

async function req(
	path,
	{ cookie, method = 'GET', form, multipart, redirect = 'manual', headers = {} } = {}
) {
	// Ask for HTML so SvelteKit treats the post like a browser form submission (redirects, not JSON).
	const init = { method, redirect, headers: { accept: 'text/html', ...headers } };
	if (cookie) init.headers.cookie = cookie;
	// SvelteKit CSRF check needs a matching origin on form posts.
	if (method === 'POST') init.headers.origin = BASE;
	if (form) {
		init.body = new URLSearchParams(form);
		init.headers['content-type'] = 'application/x-www-form-urlencoded';
	}
	if (multipart) init.body = multipart;
	const res = await fetch(BASE + path, init);
	const text = await res.text();
	return { res, text, location: res.headers.get('location') };
}

// --- guest access -----------------------------------------------------------------------------
{
	const home = await req('/');
	ok(home.res.status === 200 && home.text.includes('Formwrite'), 'GET / renders landing');
	const app = await req('/app');
	ok(
		app.res.status === 303 && app.location?.startsWith('/login'),
		'GET /app redirects guests to /login',
		app.location ?? ''
	);
	const login = await req('/login');
	ok(login.res.status === 200 && login.text.includes('Send code'), 'GET /login renders OTP form');
	const badOtp = await req('/login', { method: 'POST', form: { email: 'not-an-email' } });
	ok(
		badOtp.res.status === 400 && badOtp.text.includes('valid email'),
		'POST /login rejects invalid email'
	);
}

// --- owner flow -------------------------------------------------------------------------------
const owner = await mintUser('owner');
const cookie = owner.cookie;
let teamId = null;
let formId;
try {
	const app = await req('/app', { cookie });
	ok(
		app.res.status === 200 && app.text.includes('Workspaces'),
		'GET /app renders for signed-in user'
	);

	const create = await req('/app?/create', {
		cookie,
		method: 'POST',
		form: { name: 'E2E Workspace' }
	});
	teamId = create.location?.match(/^\/app\/([^/?]+)/)?.[1] ?? null;
	ok(
		create.res.status === 303 && !!teamId,
		'POST /app?/create provisions a workspace',
		create.location ?? create.text.slice(0, 200)
	);

	// Verify the isolated resources really exist with the expected permissions.
	const forms = await dbAdmin.getCollection({
		databaseId: env.APPWRITE_DATABASE_ID,
		collectionId: `forms_${teamId}`
	});
	ok(
		forms.$permissions.includes(`read("team:${teamId}")`),
		'forms collection is readable by the team only',
		JSON.stringify(forms.$permissions)
	);
	const subs = await dbAdmin.getCollection({
		databaseId: env.APPWRITE_DATABASE_ID,
		collectionId: `submissions_${teamId}`
	});
	ok(
		!subs.$permissions.some((p) => p.startsWith('create(')),
		'submissions collection has no create permission for users'
	);
	const bucket = await storageAdmin.getBucket({ bucketId: teamId });
	ok(
		bucket.$permissions.includes(`read("team:${teamId}")`) && bucket.antivirus,
		'bucket is team-scoped'
	);

	const ws = await req(`/app/${teamId}`, { cookie });
	ok(
		ws.res.status === 200 && ws.text.includes('E2E Workspace') && ws.text.includes('No forms yet'),
		'GET /app/[team] renders workspace'
	);

	const createForm = await req(`/app/${teamId}?/create`, {
		cookie,
		method: 'POST',
		form: { title: 'Feedback' }
	});
	formId = createForm.location?.match(/\/forms\/([^/?]+)/)?.[1] ?? null;
	ok(
		createForm.res.status === 303 && !!formId,
		'POST ?/create makes a form',
		createForm.location ?? createForm.text.slice(0, 200)
	);

	const editor = await req(`/app/${teamId}/forms/${formId}`, { cookie });
	ok(
		editor.res.status === 200 &&
			editor.text.includes('Feedback') &&
			editor.text.includes('Publish') &&
			editor.text.includes('Nothing selected'),
		'GET editor renders the builder for a draft form'
	);

	const fields = JSON.stringify([
		{ id: 'q_name', type: 'text', label: 'Name', required: true },
		{ id: 'q_email', type: 'email', label: 'Email', required: true },
		{
			id: 'q_rating',
			type: 'select',
			label: 'Rating',
			required: true,
			options: ['Great', 'Okay', 'Poor']
		},
		{
			id: 'q_tags',
			type: 'checkbox',
			label: 'Topics',
			required: false,
			options: ['Docs', 'Pricing']
		},
		{ id: 'q_file', type: 'file', label: 'Attachment', required: false }
	]);
	const save = await req(`/app/${teamId}/forms/${formId}?/save`, {
		cookie,
		method: 'POST',
		form: { title: 'Feedback survey', description: 'Tell us more', fields }
	});
	ok(
		save.res.status === 200 && save.text.includes('saved'),
		'POST ?/save stores fields',
		save.text.slice(0, 120)
	);

	const badSave = await req(`/app/${teamId}/forms/${formId}?/save`, {
		cookie,
		method: 'POST',
		form: { title: 'x', fields: JSON.stringify([{ type: 'select', label: 'Empty', options: [] }]) }
	});
	ok(
		badSave.res.status === 400 && badSave.text.includes('needs at least one option'),
		'POST ?/save rejects select without options'
	);

	// Public form must be hidden while draft.
	const draftPublic = await req(`/f/${teamId}/${formId}`);
	ok(
		draftPublic.res.status === 404,
		'GET /f/[team]/[form] is 404 while draft',
		String(draftPublic.res.status)
	);

	// Sections and design: a section marker plus a custom theme round-trip to the public page.
	const sectionSave = await req(`/app/${teamId}/forms/${formId}?/save`, {
		cookie,
		method: 'POST',
		form: {
			title: 'Feedback survey',
			description: 'Tell us more',
			fields: JSON.stringify([
				...JSON.parse(fields).slice(0, 2),
				{
					id: 'q_sec',
					type: 'section',
					label: 'Your experience',
					helpText: 'Almost done.',
					required: true
				},
				...JSON.parse(fields).slice(2)
			])
		}
	});
	ok(sectionSave.res.status === 200, 'POST ?/save accepts sections');
	const themedSave = await req(`/app/${teamId}/forms/${formId}/settings?/design`, {
		cookie,
		method: 'POST',
		form: {
			successMessage: 'Cheers!',
			theme: JSON.stringify({
				accent: '#0F766E',
				background: 'dark',
				radius: 'lg',
				font: 'serif',
				layout: 'steps',
				submitLabel: 'Send feedback',
				showBranding: false,
				bogus: 1
			})
		}
	});
	ok(themedSave.res.status === 200, 'POST settings?/design stores theme and success message');
	const editorThemed = await req(`/app/${teamId}/forms/${formId}`, { cookie });
	const settingsThemed = await req(`/app/${teamId}/forms/${formId}/settings`, { cookie });
	ok(
		editorThemed.text.includes('Your experience') && settingsThemed.text.includes('#0f766e'),
		'builder shows the section and settings load the normalized theme'
	);
	const share = await req(`/app/${teamId}/forms/${formId}/share`, { cookie });
	ok(
		share.res.status === 200 &&
			share.text.includes(`/f/${teamId}/${formId}?embed=1`) &&
			share.text.includes('share/qr'),
		'share page renders link, embed snippet and QR code'
	);

	// Logo upload goes into the workspace bucket and is served only to members while the form is a draft.
	const png = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
		'base64'
	);
	const logoData = new FormData();
	logoData.set('logo', new File([png], 'logo.png', { type: 'image/png' }));
	const logoUp = await req(`/app/${teamId}/forms/${formId}/settings?/logo`, {
		cookie,
		method: 'POST',
		multipart: logoData
	});
	ok(
		logoUp.res.status === 200 && logoUp.text.includes('fileId'),
		'POST ?/logo uploads a logo',
		logoUp.text.slice(0, 120)
	);
	const badLogo = new FormData();
	badLogo.set('logo', new File(['hi'], 'x.txt', { type: 'text/plain' }));
	const logoBad = await req(`/app/${teamId}/forms/${formId}/settings?/logo`, {
		cookie,
		method: 'POST',
		multipart: badLogo
	});
	ok(
		logoBad.res.status === 400 && logoBad.text.includes('PNG, JPG'),
		'POST ?/logo rejects non-images'
	);
	const logoMember = await req(`/f/${teamId}/${formId}/logo`, { cookie });
	ok(
		logoMember.res.status === 200 &&
			(logoMember.res.headers.get('content-type') ?? '').startsWith('image/webp'),
		'draft logo is served to members as a resized preview'
	);
	const logoGuest = await req(`/f/${teamId}/${formId}/logo`);
	ok(
		logoGuest.res.status === 404,
		'draft logo is hidden from guests',
		String(logoGuest.res.status)
	);

	const publish = await req(`/app/${teamId}/forms/${formId}/settings?/publish`, {
		cookie,
		method: 'POST',
		form: {}
	});
	ok(publish.res.status === 200, 'POST settings?/publish publishes');

	const pub = await req(`/f/${teamId}/${formId}`);
	ok(
		pub.res.status === 200 &&
			pub.text.includes('Feedback survey') &&
			pub.text.includes('multipart/form-data'),
		'public form renders with multipart enctype'
	);
	ok(
		pub.text.includes('--fw-accent:#0f766e') &&
			pub.text.includes('font-serif') &&
			pub.text.includes('Send feedback') &&
			pub.text.includes('Your experience') &&
			!pub.text.includes('Powered by'),
		'public form applies theme and renders section'
	);
	ok(
		pub.text.includes('id="step-0"') && pub.text.includes('id="step-1"'),
		'public form server-renders every step'
	);
	const logoPublic = await req(`/f/${teamId}/${formId}/logo`);
	ok(
		logoPublic.res.status === 200 &&
			(logoPublic.res.headers.get('cache-control') ?? '').includes('public'),
		'published logo is public and cacheable'
	);
	ok(pub.text.includes(`/f/${teamId}/${formId}/logo?v=`), 'public form renders the logo');
	const logoRemove = await req(`/app/${teamId}/forms/${formId}/settings?/removeLogo`, {
		cookie,
		method: 'POST',
		form: {}
	});
	ok(logoRemove.res.status === 200, 'POST ?/removeLogo removes the logo');
	const logoGone = await req(`/f/${teamId}/${formId}/logo`);
	ok(logoGone.res.status === 404, 'removed logo is no longer served', String(logoGone.res.status));

	// Invalid submission
	const bad = new FormData();
	bad.set('q_name', '');
	bad.set('q_email', 'nope');
	bad.set('q_rating', 'Amazing');
	const badSub = await req(`/f/${teamId}/${formId}`, { method: 'POST', multipart: bad });
	ok(
		badSub.res.status === 400 &&
			badSub.text.includes('This field is required') &&
			badSub.text.includes('valid email') &&
			badSub.text.includes('listed options'),
		'public POST validates fields'
	);

	// Valid submission with a file
	const good = new FormData();
	good.set('q_name', 'Ada Lovelace');
	good.set('q_email', 'ada@example.com');
	good.set('q_rating', 'Great');
	good.append('q_tags', 'Docs');
	good.append('q_tags', 'Pricing');
	good.set('q_file', new File(['hello, formwrite'], 'note.txt', { type: 'text/plain' }));
	const goodSub = await req(`/f/${teamId}/${formId}`, { method: 'POST', multipart: good });
	ok(
		goodSub.res.status === 200 && goodSub.text.includes('Cheers!'),
		'public POST stores a submission with a file',
		goodSub.text.slice(0, 200)
	);

	const good2 = new FormData();
	good2.set('q_name', 'Grace Hopper');
	good2.set('q_email', 'grace@example.com');
	good2.set('q_rating', 'Okay');
	const goodSub2 = await req(`/f/${teamId}/${formId}`, { method: 'POST', multipart: good2 });
	ok(goodSub2.res.status === 200, 'second public submission');

	const list = await req(`/app/${teamId}/forms/${formId}/responses`, { cookie });
	ok(
		list.res.status === 200 &&
			list.text.includes('2 responses') &&
			list.text.includes('Ada Lovelace') &&
			list.text.includes('note.txt') &&
			list.text.includes('Docs, Pricing'),
		'responses page lists responses'
	);
	const flagged = await req(`/app/${teamId}/forms/${formId}/responses?status=flagged`, {
		cookie
	});
	ok(
		flagged.res.status === 200 && flagged.text.includes('No flagged responses'),
		'responses page filters by status'
	);
	const subId = list.text.match(/data-id="([a-z0-9]+)"/)?.[1];
	ok(!!subId, 'responses table renders row ids');
	if (subId) {
		const flag = await req(`/app/${teamId}/forms/${formId}/responses?/status`, {
			cookie,
			method: 'POST',
			form: { id: subId, status: 'flagged' }
		});
		ok(flag.res.status === 200, 'owner flags a response', flag.text.slice(0, 120));
		const flaggedNow = await req(`/app/${teamId}/forms/${formId}/responses?status=flagged`, {
			cookie
		});
		ok(flaggedNow.text.includes('1 of 1'), 'flagged filter shows the flagged response');
	}
	const fileId = list.text.match(new RegExp(`/app/${teamId}/files/([a-z0-9]+)`))?.[1];
	ok(!!fileId, 'submission links to uploaded file');

	if (fileId) {
		const file = await req(`/app/${teamId}/files/${fileId}`, { cookie });
		ok(
			file.res.status === 200 &&
				file.text === 'hello, formwrite' &&
				(file.res.headers.get('content-type') ?? '').startsWith('text/plain'),
			'file route streams the upload to a member'
		);
		const guestFile = await req(`/app/${teamId}/files/${fileId}`);
		ok(guestFile.res.status === 303, 'file route redirects guests');
	}

	const csv = await req(`/app/${teamId}/forms/${formId}/responses/export`, { cookie });
	ok(
		csv.res.status === 200 &&
			csv.text.includes('Submitted at,Status,Name,Email,Rating,Topics,Attachment') &&
			!csv.text.includes('Your experience') &&
			csv.text.includes('Ada Lovelace') &&
			csv.text.includes('Docs; Pricing'),
		'CSV export works'
	);

	const settings = await req(`/app/${teamId}/settings`, { cookie });
	ok(
		settings.res.status === 200 &&
			settings.text.includes('Add a member by email') &&
			settings.text.includes('Delete workspace'),
		'settings page renders for owner'
	);

	// --- second tenant isolation ------------------------------------------------------------------
	const outsider = await mintUser('outsider');
	const denied = await req(`/app/${teamId}`, { cookie: outsider.cookie });
	ok(denied.res.status === 404, 'non-member gets 404 for the workspace', String(denied.res.status));
	const deniedSubs = await req(`/app/${teamId}/forms/${formId}/responses`, {
		cookie: outsider.cookie
	});
	ok(
		deniedSubs.res.status === 404,
		'non-member gets 404 for responses',
		String(deniedSubs.res.status)
	);
	if (fileId) {
		const deniedFile = await req(`/app/${teamId}/files/${fileId}`, { cookie: outsider.cookie });
		ok(
			deniedFile.res.status === 404,
			'non-member cannot download tenant files',
			String(deniedFile.res.status)
		);
	}

	// Add the outsider as a viewer, then check role gating.
	const invite = await req(`/app/${teamId}/settings?/invite`, {
		cookie,
		method: 'POST',
		form: { email: outsider.user.email, role: 'viewer' }
	});
	ok(
		invite.res.status === 200 && invite.text.includes('invited'),
		'owner adds a viewer',
		invite.text.slice(0, 160)
	);
	const viewerWs = await req(`/app/${teamId}`, { cookie: outsider.cookie });
	ok(
		viewerWs.res.status === 200 &&
			viewerWs.text.includes('Feedback survey') &&
			!viewerWs.text.includes('Create form'),
		'viewer sees forms but no create button'
	);
	const viewerCreate = await req(`/app/${teamId}?/create`, {
		cookie: outsider.cookie,
		method: 'POST',
		form: { title: 'Nope' }
	});
	ok(
		viewerCreate.res.status === 400,
		'Appwrite blocks viewer from creating forms',
		String(viewerCreate.res.status)
	);
	const viewerFlag = await req(`/app/${teamId}/forms/${formId}/responses?/status`, {
		cookie: outsider.cookie,
		method: 'POST',
		form: { id: subId ?? 'x', status: 'read' }
	});
	ok(
		viewerFlag.res.status === 403,
		'viewer cannot triage responses',
		String(viewerFlag.res.status)
	);
	const viewerInvite = await req(`/app/${teamId}/settings?/invite`, {
		cookie: outsider.cookie,
		method: 'POST',
		form: { email: 'x@example.com', role: 'editor' }
	});
	ok(viewerInvite.res.status === 403, 'viewer cannot add members', String(viewerInvite.res.status));

	// Logout clears the cookie.
	const logout = await req('/logout', { cookie, method: 'POST', form: {} });
	ok(
		logout.res.status === 303 && (logout.res.headers.get('set-cookie') ?? '').includes(cookieName),
		'POST /logout clears session'
	);
	const afterLogout = await req('/app', { cookie });
	ok(afterLogout.res.status === 303, 'session is invalid after logout');

	// Destroy workspace via a fresh owner session.
	const ownerAgain = await users.createSession({ userId: owner.user.$id });
	const cookie2 = `${cookieName}=${ownerAgain.secret}`;
	const destroyBad = await req(`/app/${teamId}/settings?/destroy`, {
		cookie: cookie2,
		method: 'POST',
		form: { confirm: 'wrong' }
	});
	ok(destroyBad.res.status === 400, 'destroy requires exact name');
	const destroy = await req(`/app/${teamId}/settings?/destroy`, {
		cookie: cookie2,
		method: 'POST',
		form: { confirm: 'E2E Workspace' }
	});
	ok(
		destroy.res.status === 303 && destroy.location === '/app',
		'owner destroys workspace',
		destroy.text.slice(0, 160)
	);
	const gone = await dbAdmin
		.getCollection({ databaseId: env.APPWRITE_DATABASE_ID, collectionId: `forms_${teamId}` })
		.then(() => false)
		.catch((e) => e.code === 404);
	const bucketGone = await storageAdmin
		.getBucket({ bucketId: teamId })
		.then(() => false)
		.catch((e) => e.code === 404);
	const teamGone = await teamsAdmin
		.get({ teamId })
		.then(() => false)
		.catch((e) => e.code === 404);
	ok(gone && bucketGone && teamGone, 'collections, bucket and team are removed');
	teamId = null;

	await users.delete({ userId: outsider.user.$id });
} finally {
	if (teamId) {
		await Promise.allSettled([
			dbAdmin.deleteCollection({
				databaseId: env.APPWRITE_DATABASE_ID,
				collectionId: `forms_${teamId}`
			}),
			dbAdmin.deleteCollection({
				databaseId: env.APPWRITE_DATABASE_ID,
				collectionId: `submissions_${teamId}`
			}),
			storageAdmin.deleteBucket({ bucketId: teamId }),
			teamsAdmin.delete({ teamId })
		]);
	}
	await users.delete({ userId: owner.user.$id }).catch(() => undefined);
}

console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
