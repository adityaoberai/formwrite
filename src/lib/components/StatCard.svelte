<script lang="ts">
	import Icon, { type IconName } from './Icon.svelte';

	let {
		label,
		value,
		hint = '',
		icon
	}: { label: string; value: string | number; hint?: string; icon: IconName } = $props();
</script>

<div class="card flex items-start justify-between p-4">
	<div>
		<p class="text-xs font-medium tracking-wide text-stone-500">{label}</p>
		<p class="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
		{#if hint}<p class="mt-1 text-xs text-stone-500">{hint}</p>{/if}
	</div>
	<span class="grid size-8 place-items-center rounded-lg bg-stone-100 text-stone-500">
		<Icon name={icon} size={16} />
	</span>
</div>
