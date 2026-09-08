<script lang="ts">
	import { enhance } from '$app/forms';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import StatCard from '$lib/components/StatCard.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { formatBytes, formatDateTime, plural, timeAgo } from '$lib/format';
	import { isUploadedFile, type AnswerValue } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const base = $derived(`/app/${data.workspace.id}`);
	let dialog: HTMLDialogElement | undefined = $state();
	let selectedId = $state<string | null>(null);
	const selected = $derived(data.submissions.find((s) => s.id === selectedId) ?? null);

	function open(id: string) {
		selectedId = id;
		dialog?.showModal();
	}

	function text(value: AnswerValue | undefined): string {
		if (value === null || value === undefined) return '';
		if (Array.isArray(value)) return value.join(', ');
		if (isUploadedFile(value)) return value.name;
		return value;
	}
</script>

<svelte:head><title>Responses - {data.form.title} - Formwrite</title></svelte:head>

<Toast message={form?.deleted ? 'Response deleted' : null} />

<nav class="mb-4 flex items-center gap-1.5 text-sm text-stone-500" aria-label="Breadcrumb">
	<a href={base} class="hover:text-ink">Forms</a>
	<Icon name="chevron-right" size={14} class="text-stone-300" />
	<a href="{base}/forms/{data.form.id}" class="truncate hover:text-ink">{data.form.title}</a>
	<Icon name="chevron-right" size={14} class="text-stone-300" />
	<span class="font-medium text-ink">Responses</span>
</nav>

<div class="flex flex-wrap items-start justify-between gap-4">
	<div>
		<div class="flex items-center gap-2">
			<h1 class="text-2xl font-semibold tracking-tight">{plural(data.total, 'response')}</h1>
			<StatusBadge status={data.form.status} />
		</div>
		<p class="mt-1 text-sm text-stone-600">
			Responses to <span class="font-medium text-ink">{data.form.title}</span>
		</p>
	</div>
	<div class="flex gap-2">
		<a class="btn btn-secondary" href="{base}/forms/{data.form.id}/submissions/export" download>
			<Icon name="download" size={14} /> Export CSV
		</a>
		{#if data.canEdit}
			<a class="btn btn-ghost" href="{base}/forms/{data.form.id}"
				><Icon name="pencil" size={14} /> Edit form</a
			>
		{/if}
	</div>
</div>

<div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
	<StatCard label="Total" value={data.total} icon="inbox" />
	<StatCard label="Today" value={data.stats.today} icon="clock" />
	<StatCard label="Last 7 days" value={data.stats.week} icon="bar-chart" />
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
			title={data.paged ? 'No more responses' : 'No responses yet'}
			description={data.form.status === 'published'
				? 'Share the public link and responses will show up here as they arrive.'
				: 'This form is a draft. Publish it to start collecting responses.'}
		>
			{#if data.paged}
				<a class="btn btn-secondary" href="{base}/forms/{data.form.id}/submissions"
					>Back to latest</a
				>
			{:else if data.form.status === 'published'}
				<a
					class="btn btn-secondary"
					href="/f/{data.workspace.id}/{data.form.id}"
					target="_blank"
					rel="noopener"><Icon name="external-link" size={14} /> Open public form</a
				>
			{:else if data.canEdit}
				<a class="btn btn-primary" href="{base}/forms/{data.form.id}"
					><Icon name="send" size={14} /> Go to editor</a
				>
			{/if}
		</EmptyState>
	</div>
{:else}
	<div class="card mt-6 overflow-x-auto">
		<table class="table">
			<thead>
				<tr>
					<th class="whitespace-nowrap">Submitted</th>
					{#each data.form.fields as field (field.id)}
						<th class="max-w-[220px] truncate whitespace-nowrap">{field.label}</th>
					{/each}
					<th><span class="sr-only">Actions</span></th>
				</tr>
			</thead>
			<tbody class="align-top">
				{#each data.submissions as sub (sub.id)}
					<tr class="cursor-pointer hover:bg-stone-50/70" onclick={() => open(sub.id)}>
						<td class="whitespace-nowrap">
							<span class="block font-medium">{timeAgo(sub.createdAt)}</span>
							<span class="block text-xs text-stone-500">{formatDateTime(sub.createdAt)}</span>
						</td>
						{#each data.form.fields as field (field.id)}
							{@const value = sub.answers[field.id]}
							<td class="max-w-[260px]">
								{#if value !== undefined && isUploadedFile(value)}
									<a
										class="inline-flex items-center gap-1 text-brand-700 hover:underline"
										href="{base}/files/{value.fileId}"
										target="_blank"
										rel="noopener"
										onclick={(e) => e.stopPropagation()}
									>
										<Icon name="paperclip" size={12} />
										{value.name}
									</a>
									<span class="text-xs text-stone-400">({formatBytes(value.size)})</span>
								{:else if text(value)}
									<span class="line-clamp-2 break-words whitespace-pre-line">{text(value)}</span>
								{:else}
									<span class="text-stone-300">-</span>
								{/if}
							</td>
						{/each}
						<td class="text-right whitespace-nowrap">
							<button
								class="btn btn-ghost btn-sm"
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									open(sub.id);
								}}>View</button
							>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="mt-4 flex items-center justify-between text-sm text-stone-500">
		<span>Showing {data.submissions.length} of {data.total}</span>
		<div class="flex gap-2">
			{#if data.paged}
				<a class="btn btn-secondary btn-sm" href="{base}/forms/{data.form.id}/submissions"
					><Icon name="arrow-left" size={12} /> Latest</a
				>
			{/if}
			{#if data.nextCursor}
				<a class="btn btn-secondary btn-sm" href="?after={data.nextCursor}"
					>Older <Icon name="arrow-right" size={12} /></a
				>
			{/if}
		</div>
	</div>
{/if}

<dialog
	bind:this={dialog}
	class="m-auto w-[min(92vw,560px)] rounded-2xl border border-stone-200 p-0 shadow-pop backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
	onclose={() => (selectedId = null)}
>
	{#if selected}
		<div class="flex items-start justify-between gap-4 border-b border-stone-100 p-5">
			<div>
				<h2 class="font-semibold">Response</h2>
				<p class="mt-0.5 text-sm text-stone-500">{formatDateTime(selected.createdAt)}</p>
			</div>
			<button
				class="btn btn-ghost btn-icon"
				type="button"
				onclick={() => dialog?.close()}
				aria-label="Close"><Icon name="x" size={16} /></button
			>
		</div>
		<dl class="max-h-[60vh] divide-y divide-stone-100 overflow-y-auto px-5">
			{#each data.form.fields as field (field.id)}
				{@const value = selected.answers[field.id]}
				<div class="py-3">
					<dt class="text-xs font-medium tracking-wide text-stone-500">{field.label}</dt>
					<dd class="mt-1 text-sm break-words whitespace-pre-line">
						{#if value !== undefined && isUploadedFile(value)}
							<a
								class="inline-flex items-center gap-1.5 text-brand-700 hover:underline"
								href="{base}/files/{value.fileId}"
								target="_blank"
								rel="noopener"
							>
								<Icon name="paperclip" size={14} />
								{value.name} <span class="text-xs text-stone-400">({formatBytes(value.size)})</span>
							</a>
						{:else if text(value)}
							{text(value)}
						{:else}
							<span class="text-stone-400">No answer</span>
						{/if}
					</dd>
				</div>
			{/each}
			{#if selected.userAgent}
				<div class="py-3">
					<dt class="text-xs font-medium tracking-wide text-stone-500">Browser</dt>
					<dd class="mt-1 truncate text-xs text-stone-500" title={selected.userAgent}>
						{selected.userAgent}
					</dd>
				</div>
			{/if}
		</dl>
		<div class="flex items-center justify-between border-t border-stone-100 p-4">
			<span class="text-xs text-stone-400">ID {selected.id}</span>
			{#if data.canEdit}
				<form
					method="POST"
					action="?/delete"
					use:enhance={({ cancel }) => {
						if (!confirm('Delete this response? Any attached files are removed too.')) cancel();
						else dialog?.close();
					}}
				>
					<input type="hidden" name="submissionId" value={selected.id} />
					<button class="btn btn-ghost btn-sm text-red-700" type="submit"
						><Icon name="trash" size={14} /> Delete response</button
					>
				</form>
			{/if}
		</div>
	{/if}
</dialog>
