<script lang="ts">
	import { enhance } from '$app/forms';
	import { beforeNavigate } from '$app/navigation';
	import Builder from '$lib/components/Builder.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { FormField } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// The builder owns an editable copy of the form; `data` is only the starting point on purpose.
	// svelte-ignore state_referenced_locally
	let title = $state(data.form.title);
	// svelte-ignore state_referenced_locally
	let description = $state(data.form.description);
	// svelte-ignore state_referenced_locally
	let fields = $state<FormField[]>(structuredClone(data.form.fields));
	// svelte-ignore state_referenced_locally
	let lastSaved = $state(JSON.stringify({ title, description, fields }));
	let saving = $state(false);
	let savedAt = $state<string | null>(null);
	let saveForm: HTMLFormElement | undefined = $state();

	const snapshot = $derived(JSON.stringify({ title, description, fields }));
	const dirty = $derived(snapshot !== lastSaved);
	const canEdit = $derived(data.canEdit);

	function requestSave() {
		if (!dirty || saving || !canEdit) return;
		saveForm?.requestSubmit();
	}

	function onKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
			e.preventDefault();
			requestSave();
		}
	}

	beforeNavigate(({ cancel, willUnload }) => {
		if (dirty && !willUnload && !confirm('You have unsaved changes. Leave without saving?'))
			cancel();
	});
</script>

<svelte:head><title>{data.form.title} - Formwrite</title></svelte:head>

<svelte:window
	onkeydown={onKeydown}
	onbeforeunload={(e) => {
		if (dirty) e.preventDefault();
	}}
/>

{#snippet titleEditor()}
	<input
		class="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-xl font-bold tracking-tight hover:border-stone-200 focus:border-brand-500 focus:bg-white focus:outline-none disabled:hover:border-transparent"
		type="text"
		bind:value={title}
		placeholder="Form title"
		maxlength="200"
		disabled={!canEdit}
		aria-label="Form title"
	/>
	<input
		class="mt-0.5 w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-stone-500 hover:border-stone-200 focus:border-brand-500 focus:bg-white focus:outline-none disabled:hover:border-transparent"
		type="text"
		bind:value={description}
		placeholder="Add a description shown under the title (optional)"
		maxlength="2000"
		disabled={!canEdit}
		aria-label="Form description"
	/>
{/snippet}

<div class="flex h-full min-h-0 flex-col">
	<!-- Desktop header: title, description and save. On phones the title lives on the canvas and
	     save sits in a bottom bar that only appears when there is something to save. -->
	<div
		class="hidden items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 md:px-6 lg:flex"
	>
		<div class="min-w-0 flex-1">{@render titleEditor()}</div>

		<form
			method="POST"
			id="save-form"
			action="?/save"
			bind:this={saveForm}
			class="flex items-center gap-3"
			use:enhance={() => {
				saving = true;
				const pending = snapshot;
				return async ({ result, update }) => {
					saving = false;
					if (result.type === 'success') {
						lastSaved = pending;
						savedAt = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
					}
					await update({ reset: false, invalidateAll: result.type === 'success' });
				};
			}}
		>
			<input type="hidden" name="title" value={title} />
			<input type="hidden" name="description" value={description} />
			<input type="hidden" name="fields" value={JSON.stringify(fields)} />
			<span class="text-xs text-stone-500">
				{#if saving}
					Saving...
				{:else if dirty}
					<span class="inline-flex items-center gap-1.5 text-amber-700"
						><span class="size-1.5 rounded-full bg-amber-500"></span>Unsaved changes</span
					>
				{:else if savedAt}
					Saved at {savedAt}
				{:else}
					All changes saved
				{/if}
			</span>
			{#if canEdit}
				<button
					type="submit"
					class="btn btn-primary"
					disabled={!dirty || saving}
					title="Save (Ctrl/Cmd+S)"
				>
					<Icon name="check" size={16} /> Save
				</button>
			{/if}
		</form>
	</div>

	{#if form?.message}
		<div
			class="flex items-center gap-2 border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-800"
			role="alert"
		>
			<Icon name="alert-circle" size={15} />
			{form.message}
		</div>
	{/if}
	{#if !canEdit}
		<div
			class="flex items-center gap-2 border-b border-stone-200 bg-stone-100 px-6 py-2 text-sm text-stone-600"
		>
			<Icon name="eye" size={15} /> You are viewing this form read-only. Editors and owners can make changes.
		</div>
	{/if}

	<div class="min-h-0 flex-1">
		<Builder
			bind:fields
			theme={data.form.theme}
			{title}
			{description}
			logoUrl={data.logoUrl}
			disabled={!canEdit}
			header={titleEditor}
		/>
	</div>

	{#if canEdit && (dirty || saving)}
		<div
			class="flex items-center justify-between gap-3 border-t border-stone-200 bg-white px-4 py-2 lg:hidden"
		>
			<span class="text-xs text-stone-500">
				{#if saving}
					Saving...
				{:else}
					<span class="inline-flex items-center gap-1.5 text-amber-700"
						><span class="size-1.5 rounded-full bg-amber-500"></span>Unsaved changes</span
					>
				{/if}
			</span>
			<button type="submit" form="save-form" class="btn btn-primary btn-sm" disabled={saving}>
				<Icon name="check" size={14} /> Save
			</button>
		</div>
	{/if}
</div>
