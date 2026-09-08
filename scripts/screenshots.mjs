// Visual smoke test: seeds a demo workspace through the SSR routes, then screenshots key pages
// with a headless Chromium-based browser driven over the DevTools protocol. Cleans up afterwards.
//   node scripts/screenshots.mjs [outDir]
import { Client, Users, ID, Teams, DocumentsDB, Storage } from 'node-appwrite';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
const OUT = process.argv[2] ?? 'screenshots';
mkdirSync(OUT, { recursive: true });

const BROWSERS = [
	'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Google/Chrome/Application/chrome.exe'
];
const browserPath = process.env.BROWSER ?? BROWSERS.find((p) => existsSync(p));
if (!browserPath) throw new Error('No Chromium-based browser found; set BROWSER=/path/to/exe');

const admin = new Client()
	.setEndpoint(env.APPWRITE_ENDPOINT)
	.setProject(env.APPWRITE_PROJECT_ID)
	.setKey(env.APPWRITE_API_KEY);
const users = new Users(admin);
const cookieName = `a_session_${env.APPWRITE_PROJECT_ID}`;

async function req(path, { cookie, method = 'GET', form, multipart } = {}) {
	const headers = { accept: 'text/html' };
	if (cookie) headers.cookie = cookie;
	if (method === 'POST') headers.origin = BASE;
	const init = { method, headers, redirect: 'manual' };
	if (form) {
		init.body = new URLSearchParams(form);
		headers['content-type'] = 'application/x-www-form-urlencoded';
	}
	if (multipart) init.body = multipart;
	const res = await fetch(BASE + path, init);
	return { res, text: await res.text(), location: res.headers.get('location') };
}

// --- seed --------------------------------------------------------------------------------------
const user = await users.create({
	userId: ID.unique(),
	email: `formwrite-shot-${Date.now()}@example.com`,
	name: 'Ada Lovelace'
});
const session = await users.createSession({ userId: user.$id });
const cookie = `${cookieName}=${session.secret}`;
let teamId;
let browser;
try {
	const created0 = await req('/app?/create', {
		cookie,
		method: 'POST',
		form: { name: 'Acme Research' }
	});
	teamId = created0.location.match(/^\/app\/([^/?]+)/)[1];
	const created = await req(`/app/${teamId}?/create`, {
		cookie,
		method: 'POST',
		form: { title: 'Customer feedback' }
	});
	const formId = created.location.match(/\/forms\/([^/?]+)/)[1];
	await req(`/app/${teamId}/forms/${formId}?/save`, {
		cookie,
		method: 'POST',
		form: {
			title: 'Customer feedback',
			description: 'Takes about a minute. Your answers stay with our team.',
			successMessage: 'Thanks, we read every response.',
			fields: JSON.stringify([
				{
					id: 'q_name',
					type: 'text',
					label: 'Your name',
					required: true,
					placeholder: 'Ada Lovelace'
				},
				{ id: 'q_email', type: 'email', label: 'Work email', required: true },
				{
					id: 'q_rating',
					type: 'radio',
					label: 'How did we do?',
					required: true,
					options: ['Great', 'Okay', 'Poor']
				},
				{
					id: 'q_topics',
					type: 'checkbox',
					label: 'What should we improve?',
					required: false,
					options: ['Docs', 'Pricing', 'Support']
				},
				{
					id: 'q_more',
					type: 'textarea',
					label: 'Anything else?',
					required: false,
					helpText: 'Optional, but we appreciate detail.'
				},
				{ id: 'q_file', type: 'file', label: 'Screenshot', required: false }
			])
		}
	});
	await req(`/app/${teamId}/forms/${formId}?/save`, {
		cookie,
		method: 'POST',
		form: {
			title: 'Customer feedback',
			description: 'Takes about a minute. Your answers stay with our team.',
			successMessage: 'Thanks, we read every response.',
			fields: JSON.stringify([
				{ id: 'q_s1', type: 'section', label: 'About you', helpText: 'Two quick questions.', required: false },
				{ id: 'q_name', type: 'text', label: 'Your name', required: true, placeholder: 'Ada Lovelace' },
				{ id: 'q_email', type: 'email', label: 'Work email', required: true },
				{ id: 'q_s2', type: 'section', label: 'Your experience', helpText: 'Be honest, we can take it.', required: false },
				{ id: 'q_rating', type: 'radio', label: 'How did we do?', required: true, options: ['Great', 'Okay', 'Poor'] },
				{ id: 'q_topics', type: 'checkbox', label: 'What should we improve?', required: false, options: ['Docs', 'Pricing', 'Support'] },
				{ id: 'q_more', type: 'textarea', label: 'Anything else?', required: false, helpText: 'Optional, but we appreciate detail.' },
				{ id: 'q_file', type: 'file', label: 'Screenshot', required: false }
			]),
			theme: JSON.stringify({ accent: '#0f766e', background: 'gradient', radius: 'lg', font: 'serif', layout: 'steps', submitLabel: 'Send feedback', showBranding: true })
		}
	});
	await req(`/app/${teamId}/forms/${formId}?/publish`, {
		cookie,
		method: 'POST',
		form: { status: 'published' }
	});
	for (const [name, email, rating, more] of [
		['Grace Hopper', 'grace@example.com', 'Great', 'The live preview is lovely.'],
		['Alan Turing', 'alan@example.com', 'Okay', 'Would like dark mode.'],
		['Katherine Johnson', 'kj@example.com', 'Great', '']
	]) {
		const fd = new FormData();
		fd.set('q_name', name);
		fd.set('q_email', email);
		fd.set('q_rating', rating);
		fd.append('q_topics', 'Docs');
		fd.set('q_more', more);
		if (name === 'Grace Hopper')
			fd.set('q_file', new File(['hi'], 'screenshot.txt', { type: 'text/plain' }));
		await req(`/f/${teamId}/${formId}`, { method: 'POST', multipart: fd });
	}

	// --- browser -----------------------------------------------------------------------------------
	const port = 9333;
	browser = spawn(
		browserPath,
		[
			'--headless=new',
			'--disable-gpu',
			'--no-first-run',
			'--hide-scrollbars',
			`--remote-debugging-port=${port}`,
			`--user-data-dir=${join(process.env.TEMP ?? '.', 'formwrite-shots-profile')}`,
			'--window-size=1440,900',
			'about:blank'
		],
		{ stdio: 'ignore' }
	);
	let version;
	for (let i = 0; i < 50 && !version; i++) {
		await new Promise((r) => setTimeout(r, 200));
		version = await fetch(`http://127.0.0.1:${port}/json/version`)
			.then((r) => r.json())
			.catch(() => null);
	}
	if (!version) throw new Error('Browser did not expose DevTools');
	const ws = new WebSocket(version.webSocketDebuggerUrl);
	await new Promise((r, j) => {
		ws.onopen = r;
		ws.onerror = j;
	});
	let id = 0;
	const pending = new Map();
	const events = new Set();
	ws.onmessage = (m) => {
		const msg = JSON.parse(m.data);
		if (msg.id && pending.has(msg.id)) {
			pending.get(msg.id)(msg);
			pending.delete(msg.id);
		}
		if (msg.method) events.add(msg.method);
	};
	const send = (method, params = {}, sessionId) =>
		new Promise((r) => {
			const i = ++id;
			pending.set(i, r);
			ws.send(JSON.stringify({ id: i, method, params, sessionId }));
		});

	const {
		result: { targetId }
	} = await send('Target.createTarget', { url: 'about:blank' });
	const {
		result: { sessionId }
	} = await send('Target.attachToTarget', { targetId, flatten: true });
	await send('Page.enable', {}, sessionId);
	await send('Network.enable', {}, sessionId);
	await send(
		'Emulation.setDeviceMetricsOverride',
		{ width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
		sessionId
	);

	async function shot(path, file, { fullPage = true, width = 1440 } = {}) {
		await send(
			'Emulation.setDeviceMetricsOverride',
			{ width, height: 900, deviceScaleFactor: 1, mobile: width < 800 },
			sessionId
		);
		await send('Page.navigate', { url: BASE + path }, sessionId);
		await new Promise((r) => setTimeout(r, 1800));
		let clip;
		if (fullPage) {
			const {
				result: { cssContentSize }
			} = await send('Page.getLayoutMetrics', {}, sessionId);
			clip = {
				x: 0,
				y: 0,
				width,
				height: Math.min(Math.ceil(cssContentSize.height), 4000),
				scale: 1
			};
			await send(
				'Emulation.setDeviceMetricsOverride',
				{ width, height: clip.height, deviceScaleFactor: 1, mobile: width < 800 },
				sessionId
			);
			await new Promise((r) => setTimeout(r, 300));
		}
		const { result } = await send(
			'Page.captureScreenshot',
			{ format: 'png', clip, captureBeyondViewport: true },
			sessionId
		);
		writeFileSync(join(OUT, file), Buffer.from(result.data, 'base64'));
		console.log('saved', file);
	}

	// Public pages first; signed-in users are redirected away from them.
	await shot('/', 'landing.png');
	await shot('/login', 'login.png', { fullPage: false });
	await send(
		'Network.setCookie',
		{ name: cookieName, value: session.secret, url: BASE, httpOnly: true },
		sessionId
	);
	await shot('/app', 'workspaces.png', { fullPage: false });
	await shot(`/app/${teamId}`, 'forms.png', { fullPage: false });
	await shot(`/app/${teamId}/forms/${formId}`, 'editor.png');
	await send('Runtime.evaluate', { expression: `document.querySelector('[role=tab]:nth-child(2)').click()` }, sessionId);
	await new Promise((r) => setTimeout(r, 500));
	{
		const { result: { cssContentSize } } = await send('Page.getLayoutMetrics', {}, sessionId);
		const h = Math.min(Math.ceil(cssContentSize.height), 4000);
		await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: h, deviceScaleFactor: 1, mobile: false }, sessionId);
		await new Promise((r) => setTimeout(r, 300));
		const { result } = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1440, height: h, scale: 1 }, captureBeyondViewport: true }, sessionId);
		writeFileSync(join(OUT, 'editor-design.png'), Buffer.from(result.data, 'base64'));
		console.log('saved editor-design.png');
	}
	await shot(`/app/${teamId}/forms/${formId}/submissions`, 'submissions.png', { fullPage: false });
	await shot(`/app/${teamId}/settings`, 'settings.png');
	await shot(`/f/${teamId}/${formId}`, 'public-form.png');
	await shot(`/f/${teamId}/${formId}`, 'public-form-mobile.png', { width: 390 });
	await shot(`/app/${teamId}`, 'forms-mobile.png', { width: 390, fullPage: false });
	ws.close();
} finally {
	browser?.kill();
	if (teamId) {
		const db = new DocumentsDB(admin);
		await Promise.allSettled([
			db.deleteCollection({
				databaseId: env.APPWRITE_DATABASE_ID,
				collectionId: `forms_${teamId}`
			}),
			db.deleteCollection({
				databaseId: env.APPWRITE_DATABASE_ID,
				collectionId: `submissions_${teamId}`
			}),
			new Storage(admin).deleteBucket({ bucketId: teamId }),
			new Teams(admin).delete({ teamId })
		]);
	}
	await users.delete({ userId: user.$id }).catch(() => undefined);
	console.log('cleaned up');
}
