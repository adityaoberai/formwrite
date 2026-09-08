<script lang="ts">
	import { navigating } from '$app/state';

	// Only show the bar for navigations that take a noticeable amount of time.
	let visible = $state(false);
	$effect(() => {
		if (!navigating.to) {
			visible = false;
			return;
		}
		const t = setTimeout(() => (visible = true), 150);
		return () => clearTimeout(t);
	});
</script>

{#if visible}
	<div
		class="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden"
		aria-hidden="true"
	>
		<div class="h-full w-1/3 animate-progress bg-brand-600"></div>
	</div>
{/if}
