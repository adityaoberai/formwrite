<script lang="ts">
	import { fly } from 'svelte/transition';
	import Icon from './Icon.svelte';

	let {
		message,
		kind = 'success',
		duration = 3200
	}: {
		message: string | null | undefined;
		kind?: 'success' | 'error';
		duration?: number;
	} = $props();

	let shown = $state<string | null>(null);
	$effect(() => {
		if (!message) return;
		shown = message;
		const t = setTimeout(() => (shown = null), duration);
		return () => clearTimeout(t);
	});
</script>

{#if shown}
	<div
		class="fixed bottom-5 left-1/2 z-50 -translate-x-1/2"
		transition:fly={{ y: 12, duration: 200 }}
		role="status"
	>
		<div
			class="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-pop {kind ===
			'success'
				? 'border-stone-800 bg-ink text-white'
				: 'border-red-200 bg-red-50 text-red-800'}"
		>
			<Icon name={kind === 'success' ? 'check-circle' : 'alert-circle'} size={16} />
			{shown}
		</div>
	</div>
{/if}
