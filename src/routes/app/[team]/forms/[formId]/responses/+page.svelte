<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { formatAnswer } from '$lib/fields';
	import { formatBytes, formatDateTime, timeAgo, truncate } from '$lib/format';
	import { isQuestion, isUploadedFile, type SubmissionStatus } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Row = PageData['submissions'][number];

	const base = $derived(`/app/${data.workspace.id}/forms/${data.form.id}/responses`);
	const columns = $derived(data.form.fields.filter(isQuestion));
	const visibleColumns = $derived(columns.slice(0, 5));

	let selectedId = $state<string | null>(null);
	let detailOpen = $state(false);
	let confirmDelete = $state<Row | null>(null);
	let live = $state(true);
	let refreshing = $state(false);
	let lastRefresh = $state<Date | null>(null);

	// Re-resolve the row from fresh data so status changes show up while the modal is open.
	const selected = $derived(data.submissions.find((s) => s.id === selectedId) ?? null);

	function open(row: Row) {
		selectedId = row.id;
		detailOpen = true;
	}

	async function refresh() {
		refreshing = true;
		await invalidate('app:form');
		refreshing = false;
		lastRefresh = new Date();
	}

	onMount(() => {
		const id = setInterval(() => {
			if (live && document.visibilityState === 'visible' && !detailOpen) refresh();
		}, 8000);
		return () => clearInterval(id);
	});

	const filters: { value: SubmissionStatus | null; label: string }[] = [
		{ value: null, label: 'All' },
		{ value: 'new', label: 'New' },
		{ value: 'read', label: 'Read' },
		{ value: 'flagged', label: 'Flagged' }
	];
	const filterHref = (value: SubmissionStatus | null) => (value ? `${base}?status=${value}` : base);
	const countLabel = $derived(
		`${data.submissions.length} of ${data.total.toLocaleString()} ${data.statusFilter ? `${data.statusFilter} ` : ''}responses`
	);
</script>

<svelte:head><title>Responses - {data.form.title} - Formwrite</title></svelte:head>

<Toast message={form?.deleted ? 'Response deleted' : null} />

<div class="mx-auto max-w-7xl px-4 py-6 md:px-8">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-1 rounded-lg bg-stone-100 p-0.5 text-sm">
			{#each filters as f (f.label)}
				<a
					href={filterHref(f.value)}
					class="rounded-md px-3 py-1 font-medium {data.statusFilter === f.value
						? 'bg-white text-ink shadow-card'
						: 'text-stone-500 hover:text-ink'}"
					aria-current={data.statusFilter === f.value ? 'page' : undefined}
				>
					{f.label}
				</a>
			{/each}
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				class="btn btn-secondary btn-sm"
				onclick={() => (live = !live)}
				title={live ? 'Checking for new responses every few seconds' : 'Auto-refresh paused'}
				aria-pressed={live}
			>
				<span class="relative flex size-2">
					{#if live}<span
							class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"
						></span>{/if}
					<span
						class="relative inline-flex size-2 rounded-full {live
							? 'bg-emerald-500'
							: 'bg-stone-400'}"
					></span>
				</span>
				{live ? 'Live' : 'Paused'}
			</button>
			<button
				type="button"
				class="btn btn-secondary btn-sm btn-icon"
				onclick={refresh}
				disabled={refreshing}
				aria-label="Refresh"
				title="Refresh"
			>
				<Icon name="refresh" size={14} class={refreshing ? 'animate-spin' : ''} />
			</button>
			<a href="{base}/export" class="btn btn-secondary btn-sm" download
				><Icon name="download" size={14} /> Export CSV</a
			>
		</div>
	</div>

	{#if form?.message}
		<p class="alert-error mt-4" role="alert">
			<Icon name="alert-circle" size={16} class="mt-0.5" />{form.message}
		</p>
	{/if}

	{#if data.submissions.length === 0}
		<div class="mt-6">
			<EmptyState
				icon="inbox"
				title={data.paged
					? 'No more responses'
					: data.statusFilter
						? `No ${data.statusFilter} responses`
						: 'No responses yet'}
				description={data.paged
					? 'You have reached the end of the list.'
					: data.statusFilter
						? 'Try a different filter.'
						: data.form.status === 'published'
							? 'Share the link and responses will show up here automatically.'
							: 'Publish the form and share its link to start collecting responses.'}
			>
				{#if data.paged}
					<a class="btn btn-secondary" href={filterHref(data.statusFilter)}>Back to latest</a>
				{:else if data.statusFilter}
					<a class="btn btn-secondary" href={base}>Show all</a>
				{:else}
					<a href="/app/{data.workspace.id}/forms/{data.form.id}/share" class="btn btn-primary"
						><Icon name="share" size={16} /> Go to Share</a
					>
				{/if}
			</EmptyState>
		</div>
	{:else}
		<div class="card mt-4 overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead
						class="bg-stone-50/80 text-left text-xs font-semibold tracking-wide text-stone-500 uppercase"
					>
						<tr>
							<th class="px-4 py-2.5 whitespace-nowrap">Submitted</th>
							{#each visibleColumns as c (c.id)}
								<th class="px-4 py-2.5 whitespace-nowrap">{truncate(c.label, 28)}</th>
							{/each}
							{#if columns.length > visibleColumns.length}
								<th class="px-4 py-2.5 font-medium whitespace-nowrap text-stone-400 normal-case"
									>+{columns.length - visibleColumns.length} more</th
								>
							{/if}
							<th class="px-4 py-2.5"><span class="sr-only">Open</span></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-stone-100">
						{#each data.submissions as s (s.id)}
							<tr
								class="cursor-pointer hover:bg-stone-50 {s.status === 'new' ? 'font-medium' : ''}"
								data-id={s.id}
								onclick={() => open(s)}
							>
								<td
									class="px-4 py-2.5 whitespace-nowrap text-stone-500"
									title={formatDateTime(s.createdAt)}
								>
									<span class="inline-flex items-center gap-2">
										{#if s.status === 'new'}<span class="size-1.5 rounded-full bg-brand-500"
											></span>{/if}
										{#if s.status === 'flagged'}<Icon
												name="flag"
												size={12}
												class="text-amber-600"
											/>{/if}
										{timeAgo(s.createdAt)}
									</span>
								</td>
								{#each visibleColumns as c (c.id)}
									{@const value = s.answers[c.id]}
									<td class="max-w-[240px] truncate px-4 py-2.5 text-ink">
										{#if value !== undefined && isUploadedFile(value)}
											<a
												class="inline-flex items-center gap-1 text-brand-700 hover:underline"
												href="{data.fileBase}/{value.fileId}"
												target="_blank"
												rel="noopener"
												onclick={(e) => e.stopPropagation()}
											>
												<Icon name="paperclip" size={12} />{truncate(value.name, 24)}
											</a>
										{:else}
											{truncate(formatAnswer(c, value), 48) || '-'}
										{/if}
									</td>
								{/each}
								{#if columns.length > visibleColumns.length}<td></td>{/if}
								<td class="px-4 py-2.5 text-right">
									<Icon name="chevron-right" size={14} class="text-stone-400" />
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div
				class="flex items-center justify-between border-t border-stone-100 px-4 py-2 text-xs text-stone-500"
			>
				<span>
					{countLabel}{#if lastRefresh}&nbsp;&middot; refreshed {timeAgo(
							lastRefresh.toISOString()
						)}{/if}
				</span>
				<div class="flex gap-2">
					{#if data.paged}
						<a class="btn btn-secondary btn-sm" href={filterHref(data.statusFilter)}
							><Icon name="chevron-left" size={12} /> Latest</a
						>
					{/if}
					{#if data.nextCursor}
						<a
							class="btn btn-secondary btn-sm"
							href="{base}?{data.statusFilter
								? `status=${data.statusFilter}&`
								: ''}after={data.nextCursor}">Older <Icon name="chevron-right" size={12} /></a
						>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<Modal
	bind:open={detailOpen}
	title="Response"
	description={selected ? formatDateTime(selected.createdAt) : ''}
	size="lg"
	onclose={() => (selectedId = null)}
>
	{#if selected}
		{@const s = selected}
		<dl class="divide-y divide-stone-100">
			{#each columns as c (c.id)}
				{@const value = s.answers[c.id]}
				<div class="grid gap-1 py-3 sm:grid-cols-[200px_1fr] sm:gap-4">
					<dt class="text-sm font-medium text-stone-500">{c.label}</dt>
					<dd class="text-sm break-words text-ink">
						{#if value !== undefined && isUploadedFile(value)}
							<a
								href="{data.fileBase}/{value.fileId}"
								target="_blank"
								rel="noopener"
								class="inline-flex items-center gap-1.5 text-brand-700 hover:underline"
							>
								<Icon name="download" size={14} />{value.name}
								<span class="text-stone-400">({formatBytes(value.size)})</span>
							</a>
						{:else if c.type === 'url' && typeof value === 'string' && value}
							<a href={value} target="_blank" rel="noopener" class="text-brand-700 hover:underline"
								>{value}</a
							>
						{:else if c.type === 'email' && typeof value === 'string' && value}
							<a href="mailto:{value}" class="text-brand-700 hover:underline">{value}</a>
						{:else if c.type === 'textarea'}
							<p class="whitespace-pre-wrap">{formatAnswer(c, value) || '-'}</p>
						{:else}
							{formatAnswer(c, value) || '-'}
						{/if}
					</dd>
				</div>
			{/each}
		</dl>
		<div class="mt-4 flex flex-wrap items-center gap-2 text-xs text-stone-500">
			{#if s.status === 'flagged'}
				<span class="badge bg-amber-50 text-amber-700"><Icon name="flag" size={11} /> Flagged</span>
			{:else if s.status === 'new'}
				<span class="badge bg-brand-50 text-brand-700">New</span>
			{:else}
				<span class="badge bg-stone-100 text-stone-600">Read</span>
			{/if}
			{#if s.embed}
				<span class="badge bg-stone-100 text-stone-600"
					><Icon name="code" size={11} /> via embed</span
				>
			{/if}
			{#if s.userAgent}
				<span class="badge max-w-[260px] truncate bg-stone-100 text-stone-600" title={s.userAgent}
					><Icon name="globe" size={11} /> {truncate(s.userAgent, 40)}</span
				>
			{/if}
			<span class="ml-auto font-mono">{s.id}</span>
			<CopyButton text={s.id} label="Copy id" class="btn btn-ghost btn-sm" />
		</div>
	{/if}
	{#snippet footer()}
		{#if selected && data.canEdit}
			{@const s = selected}
			<form
				method="POST"
				action="?/status"
				class="mr-auto flex gap-2"
				use:enhance={() =>
					async ({ update }) => {
						await update({ reset: false });
					}}
			>
				<input type="hidden" name="id" value={s.id} />
				{#if s.status !== 'flagged'}
					<button type="submit" name="status" value="flagged" class="btn btn-secondary btn-sm"
						><Icon name="flag" size={14} /> Flag</button
					>
				{:else}
					<button type="submit" name="status" value="read" class="btn btn-secondary btn-sm"
						><Icon name="flag" size={14} /> Unflag</button
					>
				{/if}
				{#if s.status === 'new'}
					<button type="submit" name="status" value="read" class="btn btn-secondary btn-sm"
						><Icon name="check" size={14} /> Mark read</button
					>
				{/if}
			</form>
			<button
				type="button"
				class="btn btn-danger btn-sm"
				onclick={() => {
					confirmDelete = s;
					detailOpen = false;
				}}><Icon name="trash" size={14} /> Delete</button
			>
		{/if}
	{/snippet}
</Modal>

<Modal
	open={confirmDelete !== null}
	onclose={() => (confirmDelete = null)}
	title="Delete this response?"
	description="This also removes any uploaded files. This cannot be undone."
	size="sm"
>
	{#if confirmDelete}
		<form
			method="POST"
			action="?/delete"
			class="flex justify-end gap-2"
			use:enhance={() =>
				async ({ update }) => {
					await update();
					confirmDelete = null;
				}}
		>
			<input type="hidden" name="id" value={confirmDelete.id} />
			<button type="button" class="btn btn-secondary" onclick={() => (confirmDelete = null)}
				>Cancel</button
			>
			<button type="submit" class="btn btn-danger">Delete</button>
		</form>
	{/if}
</Modal>
