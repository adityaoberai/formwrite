<script lang="ts">
	import type { FormStatus } from '$lib/types';

	let { status }: { status: FormStatus } = $props();
</script>

{#if status === 'published'}
	<span class="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset">
		<span class="relative flex size-1.5">
			<span
				class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"
			></span>
			<span class="relative inline-flex size-1.5 rounded-full bg-emerald-500"></span>
		</span>
		Live
	</span>
{:else}
	<span class="badge bg-stone-100 text-stone-700 ring-1 ring-stone-200 ring-inset">Draft</span>
{/if}
