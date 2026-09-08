<script lang="ts">
	import type { FormStatus } from '$lib/types';

	let { status }: { status: FormStatus } = $props();
</script>

{#if status === 'published'}
	<span class="badge bg-emerald-100 text-emerald-800">Published</span>
{:else}
	<span class="badge bg-stone-200 text-stone-700">Draft</span>
{/if}
