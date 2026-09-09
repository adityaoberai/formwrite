<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	let {
		open = $bindable(false),
		title,
		description = '',
		size = 'md',
		onclose,
		children,
		footer
	}: {
		open?: boolean;
		title: string;
		description?: string;
		size?: 'sm' | 'md' | 'lg';
		onclose?: () => void;
		children: Snippet;
		footer?: Snippet;
	} = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});

	function close() {
		open = false;
		onclose?.();
	}

	const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
</script>

<dialog
	bind:this={dialog}
	onclose={close}
	onclick={(e) => {
		if (e.target === dialog) close();
	}}
	class="m-auto w-[calc(100%-2rem)] {widths[
		size
	]} rounded-2xl border border-stone-200 bg-white p-0 text-ink shadow-pop backdrop:bg-ink/40 backdrop:backdrop-blur-[2px] open:animate-pop"
>
	<div class="p-6">
		<div class="flex items-start justify-between gap-4">
			<div class="min-w-0">
				<h2 class="text-lg font-semibold tracking-tight">{title}</h2>
				{#if description}
					<p class="mt-1 text-sm text-stone-500">{description}</p>
				{/if}
			</div>
			<button
				type="button"
				class="btn btn-ghost btn-icon -mt-1 -mr-2"
				onclick={close}
				aria-label="Close"
			>
				<Icon name="x" size={18} />
			</button>
		</div>
		<div class="mt-5">
			{@render children()}
		</div>
		{#if footer}
			<div class="mt-6 flex flex-wrap items-center justify-end gap-2">
				{@render footer()}
			</div>
		{/if}
	</div>
</dialog>
