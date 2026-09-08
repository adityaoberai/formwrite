<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon, { type IconName } from './Icon.svelte';

	let {
		icon,
		title,
		description,
		children
	}: { icon: IconName; title: string; description: string; children?: Snippet } = $props();
</script>

<div class="card flex flex-col items-center px-6 py-14 text-center">
	<div
		class="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 ring-inset"
	>
		<Icon name={icon} size={22} />
	</div>
	<h3 class="mt-4 text-base font-semibold">{title}</h3>
	<p class="mt-1 max-w-sm text-sm text-stone-500">{description}</p>
	{#if children}
		<div class="mt-5 flex gap-2">{@render children()}</div>
	{/if}
</div>
