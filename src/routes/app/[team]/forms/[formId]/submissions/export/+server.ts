import { Query } from 'node-appwrite';
import type { RequestHandler } from './$types';
import { DATABASE_ID } from '$lib/server/appwrite';
import { requireUser } from '$lib/server/auth';
import { notFoundOnFailure } from '$lib/server/errors';
import { formsCollection, submissionsCollection } from '$lib/server/tenant';
import {
	isQuestion,
	isUploadedFile,
	type AnswerValue,
	type FormDocument,
	type SubmissionDocument
} from '$lib/types';

const MAX_ROWS = 10_000;

function cell(value: string): string {
	// Prefix formula-looking values so spreadsheets don't execute them.
	const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
	return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function render(value: AnswerValue | undefined, origin: string, teamId: string): string {
	if (value === null || value === undefined) return '';
	if (Array.isArray(value)) return value.join('; ');
	if (isUploadedFile(value)) return `${value.name} (${origin}/app/${teamId}/files/${value.fileId})`;
	return value;
}

export const GET: RequestHandler = async (event) => {
	const { appwrite } = requireUser(event);
	const { team: teamId, formId } = event.params;

	let form: FormDocument;
	try {
		form = await appwrite.db.getDocument<FormDocument>({
			databaseId: DATABASE_ID,
			collectionId: formsCollection(teamId),
			documentId: formId
		});
	} catch (err) {
		notFoundOnFailure(err, 'Form not found');
	}

	const fields = (form.fields ?? []).filter(isQuestion);
	const lines: string[] = [['Submitted at', ...fields.map((f) => f.label)].map(cell).join(',')];

	let cursor: string | null = null;
	let count = 0;
	while (count < MAX_ROWS) {
		const queries = [Query.equal('formId', formId), Query.orderAsc('$createdAt'), Query.limit(100)];
		if (cursor) queries.push(Query.cursorAfter(cursor));
		const page = await appwrite.db.listDocuments<SubmissionDocument>({
			databaseId: DATABASE_ID,
			collectionId: submissionsCollection(teamId),
			queries
		});
		for (const sub of page.documents) {
			lines.push(
				[
					sub.$createdAt,
					...fields.map((f) => render(sub.answers?.[f.id], event.url.origin, teamId))
				]
					.map(cell)
					.join(',')
			);
		}
		count += page.documents.length;
		if (page.documents.length < 100) break;
		cursor = page.documents[page.documents.length - 1].$id;
	}

	const filename = `${form.title.replace(/[^\w.-]+/g, '_') || 'submissions'}.csv`;
	return new Response('﻿' + lines.join('\r\n') + '\r\n', {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="${filename}"`,
			'cache-control': 'no-store'
		}
	});
};
