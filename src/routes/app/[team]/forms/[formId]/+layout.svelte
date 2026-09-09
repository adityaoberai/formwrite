<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const base = $derived(`/app/${data.workspace.id}/forms/${data.form.id}`);
	const path = $derived(page.url.pathname);
	const published = $derived(data.form.status === 'published');
	const tabs = $derived<
		{ href: string; label: string; icon: IconName; active: boolean; count?: number }[]
	>([
		{ href: base, label: 'Build', icon: 'layout', active: path === base },
		{
			href: `${base}/share`,
			label: 'Share',
			icon: 'share',
			active: path.startsWith(`${base}/share`)
		},
		{
			href: `${base}/responses`,
			label: 'Responses',
			icon: 'inbox',
			active: path.startsWith(`${base}/responses`),
			count: data.responseCount
		},
		{
			href: `${base}/settings`,
			label: 'Settings',
			icon: 'settings',
			active: path.startsWith(`${base}/settings`)
		}
	]);
	let publishing = $state(false);
</script>

<div class="flex h-full min-h-0 flex-1 flex-col bg-canvas">
	<header class="border-b border-stone-200 bg-white">
		<div class="flex items-center gap-3 px-4 pt-3 md:px-6">
			<a
				href="/app/{data.workspace.id}"
				class="btn btn-ghost btn-icon -ml-2"
				aria-label="Back to forms"
				title="Back to forms"><Icon name="arrow-left" size={18} /></a
			>
			<h1 class="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">
				{data.form.title}
			</h1>
			<StatusBadge status={data.form.status} />
			<div class="flex items-center gap-2">
				{#if published}
					<a
						href={data.publicUrl}
						target="_blank"
						rel="noopener"
						class="btn btn-secondary btn-sm max-sm:size-8 max-sm:p-0"
						title="Open public form"
						aria-label="Open public form"
					>
						<Icon name="external-link" size={14} /> <span class="max-sm:sr-only">Open</span>
					</a>
				{/if}
				{#if data.canEdit}
					<form
						method="POST"
						action="{base}/settings?/{published ? 'unpublish' : 'publish'}"
						use:enhance={() => {
							publishing = true;
							return async ({ update }) => {
								publishing = false;
								await update({ invalidateAll: true });
							};
						}}
					>
						<button
							type="submit"
							class="btn btn-sm {published ? 'btn-secondary' : 'btn-primary'}"
							disabled={publishing}
						>
							{#if published}
								<Icon name="lock" size={14} /> {publishing ? 'Updating...' : 'Unpublish'}
							{:else}
								<Icon name="send" size={14} /> {publishing ? 'Publishing...' : 'Publish'}
							{/if}
						</button>
					</form>
				{/if}
			</div>
		</div>
		<nav class="mt-2 flex gap-1 overflow-x-auto px-4 md:px-6" aria-label="Form sections">
			{#each tabs as tab (tab.href)}
				<a
					href={tab.href}
					class="flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors {tab.active
						? 'border-brand-600 text-brand-700'
						: 'border-transparent text-stone-500 hover:text-ink'}"
					aria-current={tab.active ? 'page' : undefined}
				>
					<Icon name={tab.icon} size={15} />
					{tab.label}
					{#if tab.count !== undefined}
						<span
							class="rounded-full bg-stone-100 px-1.5 py-px text-[11px] text-stone-600 tabular-nums"
							>{tab.count}</span
						>
					{/if}
				</a>
			{/each}
		</nav>
	</header>

	<div class="min-h-0 flex-1 overflow-auto">
		{@render children()}
	</div>
</div>
