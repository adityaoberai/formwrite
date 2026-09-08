<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Avatar from '$lib/components/Avatar.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { plural } from '$lib/format';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let creating = $state(false);
	let showCreate = $state(page.url.searchParams.has('new'));
	const open = $derived(showCreate || data.workspaces.length === 0 || !!form?.message);
</script>

<svelte:head><title>Workspaces - Formwrite</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Workspaces</h1>
		<p class="mt-1 text-sm text-stone-600">
			Each workspace is a separate team with its own isolated forms, responses and uploads.
		</p>
	</div>
	<button class="btn btn-primary" type="button" onclick={() => (showCreate = !showCreate)}>
		<Icon name="plus" size={16} /> New workspace
	</button>
</div>

{#if open}
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
				<label class="label" for="name">Workspace name</label>
				<input
					class="input"
					id="name"
					name="name"
					required
					minlength="2"
					maxlength="80"
					placeholder="Acme Marketing"
					value={form?.name ?? ''}
				/>
			</div>
			<button class="btn btn-primary" type="submit" disabled={creating}>
				{creating ? 'Creating...' : 'Create workspace'}
			</button>
		</div>
		<p class="help flex items-center gap-1.5">
			<Icon name="shield" size={12} /> Forms, responses and uploads in a workspace are kept separate and
			are only visible to its members.
		</p>
		{#if form?.message}
			<p class="alert-error mt-3" role="alert">
				<Icon name="alert-circle" size={16} class="mt-0.5" />{form.message}
			</p>
		{/if}
	</form>
{/if}

{#if data.workspaces.length > 0}
	<ul class="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each data.workspaces as ws (ws.id)}
			<li>
				<a
					href="/app/{ws.id}"
					class="card group flex items-center gap-4 p-5 transition hover:-translate-y-px hover:border-stone-300 hover:shadow-pop"
				>
					<Avatar name={ws.name} size="lg" square />
					<span class="min-w-0 flex-1">
						<span class="block truncate font-semibold">{ws.name}</span>
						<span class="mt-0.5 block text-sm text-stone-500">{plural(ws.members, 'member')}</span>
					</span>
					<Icon
						name="arrow-right"
						size={16}
						class="text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-stone-600"
					/>
				</a>
			</li>
		{/each}
	</ul>
{:else}
	<div class="mt-8">
		<EmptyState
			icon="briefcase"
			title="No workspaces yet"
			description="Create your first workspace above. You'll be its owner and can invite teammates from settings."
		/>
	</div>
{/if}
