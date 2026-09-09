<script lang="ts">
	import Icon from './Icon.svelte';

	let {
		text,
		label = 'Copy',
		class: cls = 'btn btn-secondary btn-sm'
	}: { text: string; label?: string; class?: string } = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			clearTimeout(timer);
			timer = setTimeout(() => (copied = false), 1600);
		} catch {
			// Clipboard unavailable (for example over plain http). The text stays selectable.
		}
	}
</script>

<button type="button" class={cls} onclick={copy} aria-live="polite">
	{#if copied}
		<Icon name="check" size={14} class="text-emerald-600" />
		Copied
	{:else}
		<Icon name="copy" size={14} />
		{label}
	{/if}
</button>
