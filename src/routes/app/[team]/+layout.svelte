<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const base = $derived(`/app/${data.workspace.id}`);
	const section = $derived(page.url.pathname.startsWith(`${base}/settings`) ? 'settings' : 'forms');
	const fullScreen = $derived(page.route.id?.includes('/forms/[formId]') ?? false);
</script>

{#if fullScreen}
	{@render children()}
{:else}
	<!-- Mobile section tabs; the desktop sidebar carries this navigation. -->
	<nav
		class="mb-5 flex gap-1 rounded-xl bg-stone-200/60 p-1 text-sm lg:hidden"
		aria-label="Workspace sections"
	>
		<a
			href={base}
			class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-medium {section ===
			'forms'
				? 'bg-white shadow-card'
				: 'text-stone-600'}"
			aria-current={section === 'forms' ? 'page' : undefined}
			><Icon name="file-text" size={14} /> Forms</a
		>
		<a
			href="{base}/settings"
			class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-medium {section ===
			'settings'
				? 'bg-white shadow-card'
				: 'text-stone-600'}"
			aria-current={section === 'settings' ? 'page' : undefined}
			><Icon name="settings" size={14} /> Settings</a
		>
	</nav>

	{@render children()}
{/if}
