<script lang="ts">
	import { page } from '$app/state';
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const teamId = $derived(page.params.team ?? null);
	const workspace = $derived(
		(page.data.workspace as { id: string; name: string } | undefined) ??
			data.workspaces.find((w) => w.id === teamId)
	);
	const path = $derived(page.url.pathname);
	const isActive = (href: string, exact = false) =>
		exact ? path === href : path === href || path.startsWith(href + '/');
</script>

{#snippet switcher()}
	<details class="group relative">
		<summary
			class="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-left shadow-card transition hover:border-stone-300"
		>
			{#if workspace}
				<Avatar name={workspace.name} square />
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-semibold">{workspace.name}</span>
					<span class="block text-[11px] text-stone-500">Workspace</span>
				</span>
			{:else}
				<span class="grid size-8 place-items-center rounded-lg bg-stone-100 text-stone-500"
					><Icon name="grid" size={16} /></span
				>
				<span class="min-w-0 flex-1 text-sm font-semibold">All workspaces</span>
			{/if}
			<Icon name="chevrons-up-down" size={14} class="text-stone-400" />
		</summary>
		<div class="menu left-0 w-full">
			<p class="px-2.5 pt-1.5 pb-1 text-[11px] font-medium tracking-wide text-stone-400 uppercase">
				Workspaces
			</p>
			{#each data.workspaces as ws (ws.id)}
				<a
					href="/app/{ws.id}"
					class="menu-item"
					aria-current={ws.id === teamId ? 'true' : undefined}
				>
					<Avatar name={ws.name} size="sm" square />
					<span class="flex-1 truncate">{ws.name}</span>
					{#if ws.id === teamId}<Icon name="check" size={14} class="text-brand-600" />{/if}
				</a>
			{/each}
			<div class="my-1 border-t border-stone-100"></div>
			<a href="/app" class="menu-item"><Icon name="grid" size={14} /> All workspaces</a>
			<a href="/app?new=1" class="menu-item text-brand-700"
				><Icon name="plus" size={14} /> New workspace</a
			>
		</div>
	</details>
{/snippet}

{#snippet userMenu()}
	<div class="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5">
		<Avatar name={data.user?.name || data.user?.email || '?'} />
		<span class="min-w-0 flex-1">
			<span class="block truncate text-sm font-medium"
				>{data.user?.name || data.user?.email?.split('@')[0]}</span
			>
			<span class="block truncate text-[11px] text-stone-500">{data.user?.email}</span>
		</span>
		<form method="POST" action="/logout">
			<button class="btn btn-ghost btn-icon" type="submit" title="Sign out" aria-label="Sign out">
				<Icon name="log-out" size={16} />
			</button>
		</form>
	</div>
{/snippet}

<div class="min-h-screen lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
	<aside
		class="hidden border-r border-stone-200 bg-stone-100/60 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:gap-5 lg:p-4"
	>
		<div class="px-1.5 pt-1"><Logo href="/app" /></div>
		{@render switcher()}
		<nav class="flex-1 space-y-0.5" aria-label="Main">
			{#if teamId}
				<a
					href="/app/{teamId}"
					class="nav-item"
					aria-current={isActive(`/app/${teamId}`, true) || isActive(`/app/${teamId}/forms`)
						? 'page'
						: undefined}
				>
					<Icon name="file-text" size={16} /> Forms
				</a>
				<a
					href="/app/{teamId}/settings"
					class="nav-item"
					aria-current={isActive(`/app/${teamId}/settings`) ? 'page' : undefined}
				>
					<Icon name="settings" size={16} /> Settings
				</a>
			{:else}
				<a href="/app" class="nav-item" aria-current="page"
					><Icon name="grid" size={16} /> Workspaces</a
				>
			{/if}
		</nav>
		<div class="rounded-xl border border-dashed border-stone-300 p-3 text-xs text-stone-500">
			<p class="flex items-center gap-1.5 font-medium text-stone-700">
				<Icon name="shield" size={13} /> Private to this workspace
			</p>
			<p class="mt-1">Forms, responses and files are only visible to members.</p>
		</div>
		{@render userMenu()}
	</aside>

	<div class="flex min-w-0 flex-col">
		<header
			class="sticky top-0 z-20 border-b border-stone-200 bg-canvas/90 backdrop-blur lg:hidden"
		>
			<div class="flex items-center gap-3 px-4 py-3">
				<Logo href="/app" compact />
				<div class="flex-1">{@render switcher()}</div>
				<form method="POST" action="/logout">
					<button class="btn btn-ghost btn-icon" type="submit" aria-label="Sign out"
						><Icon name="log-out" size={16} /></button
					>
				</form>
			</div>
		</header>
		<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
			{@render children()}
		</main>
	</div>
</div>
