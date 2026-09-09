<script lang="ts">
	import { enhance } from '$app/forms';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import StatCard from '$lib/components/StatCard.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { plural, timeAgo } from '$lib/format';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let creating = $state(false);
	let showCreate = $state(false);

	const base = $derived(`/app/${data.workspace.id}`);
</script>

<svelte:head><title>Forms - {data.workspace.name} - Formwrite</title></svelte:head>

<Toast message={form?.deleted ? 'Form deleted' : null} />

<div class="flex flex-wrap items-start justify-between gap-4">
	<div>
		<p class="text-xs font-medium tracking-wide text-stone-500 uppercase">{data.workspace.name}</p>
		<h1 class="mt-1 text-2xl font-semibold tracking-tight">Forms</h1>
	</div>
	{#if data.canEdit}
		<button class="btn btn-primary" type="button" onclick={() => (showCreate = !showCreate)}>
			<Icon name="plus" size={16} /> Create form
		</button>
	{/if}
</div>

<div class="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
	<StatCard label="Forms" value={data.stats.forms} icon="file-text" />
	<StatCard
		label="Published"
		value={data.stats.published}
		icon="globe"
		hint="Accepting responses"
	/>
	<StatCard label="Responses" value={data.stats.responses} icon="inbox" hint="All time" />
	<StatCard label="Last 7 days" value={data.stats.week} icon="bar-chart" hint="New responses" />
</div>

{#if data.canEdit && (showCreate || form?.message)}
	<form
		method="POST"
		action="?/create"
		class="card mt-6 animate-rise p-5"
		use:enhance={() => {
			creating = true;
			return async ({ update }) => {
				creating = false;
				await update();
			};
		}}
	>
		<div class="flex flex-col gap-3 sm:flex-row sm:items-end">
			<div class="flex-1">
				<label class="label" for="title">Form title</label>
				<input
					class="input"
					id="title"
					name="title"
					placeholder="Customer feedback"
					maxlength="200"
				/>
			</div>
			<button class="btn btn-primary" type="submit" disabled={creating}>
				{creating ? 'Creating...' : 'Create and open editor'}
			</button>
		</div>
		<p class="help">
			Starts as a draft with a name and email question. You can change everything in the editor.
		</p>
		{#if form?.message}
			<p class="alert-error mt-3" role="alert">
				<Icon name="alert-circle" size={16} class="mt-0.5" />{form.message}
			</p>
		{/if}
	</form>
{/if}

{#if data.forms.length === 0}
	<div class="mt-6">
		<EmptyState
			icon="file-text"
			title="No forms yet"
			description={data.canEdit
				? 'Build your first form and share the link to start collecting responses.'
				: 'An editor or owner needs to add a form before you can view it.'}
		>
			{#if data.canEdit}
				<button class="btn btn-primary" type="button" onclick={() => (showCreate = true)}>
					<Icon name="plus" size={16} /> Create your first form
				</button>
			{/if}
		</EmptyState>
	</div>
{:else}
	<div class="card mt-6 overflow-x-auto">
		<table class="table">
			<thead>
				<tr>
					<th>Form</th>
					<th>Status</th>
					<th class="text-right">Responses</th>
					<th class="hidden md:table-cell">Updated</th>
					<th><span class="sr-only">Actions</span></th>
				</tr>
			</thead>
			<tbody>
				{#each data.forms as f (f.id)}
					<tr class="group hover:bg-stone-50/70">
						<td>
							<a href="{base}/forms/{f.id}" class="flex items-center gap-3">
								<span
									class="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100 ring-inset"
								>
									<Icon name="file-text" size={16} />
								</span>
								<span class="min-w-0">
									<span class="block truncate font-medium text-ink group-hover:underline"
										>{f.title}</span
									>
									<span class="block text-xs text-stone-500"
										>{plural(f.fieldCount, 'question')}</span
									>
								</span>
							</a>
						</td>
						<td><StatusBadge status={f.status} /></td>
						<td class="text-right tabular-nums">
							<a href="{base}/forms/{f.id}/responses" class="font-medium hover:underline"
								>{f.submissions}</a
							>
						</td>
						<td class="hidden whitespace-nowrap text-stone-500 md:table-cell"
							>{timeAgo(f.updatedAt)}</td
						>
						<td>
							<div class="flex items-center justify-end gap-1">
								{#if f.status === 'published'}
									<a
										class="btn btn-ghost btn-sm"
										href="/f/{data.workspace.id}/{f.id}"
										target="_blank"
										rel="noopener"
										title="Open public form"
									>
										<Icon name="external-link" size={14} /> Open
									</a>
								{/if}
								<a class="btn btn-ghost btn-sm" href="{base}/forms/{f.id}/responses"
									><Icon name="inbox" size={14} /> Responses</a
								>
								{#if data.canEdit}
									<a class="btn btn-ghost btn-sm" href="{base}/forms/{f.id}"
										><Icon name="pencil" size={14} /> Edit</a
									>
									<form
										method="POST"
										action="?/delete"
										use:enhance={({ cancel }) => {
											if (!confirm(`Delete "${f.title}" and all of its responses?`)) cancel();
										}}
									>
										<input type="hidden" name="formId" value={f.id} />
										<button
											class="btn btn-ghost btn-icon text-stone-400 hover:text-red-700"
											type="submit"
											title="Delete form"
											aria-label="Delete {f.title}"
										>
											<Icon name="trash" size={15} />
										</button>
									</form>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
