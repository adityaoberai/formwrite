<script lang="ts">
	import { enhance } from '$app/forms';
	import DesignPanel from '$lib/components/DesignPanel.svelte';
	import FormPreview from '$lib/components/FormPreview.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import type { FormLogo, FormTheme } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const canEdit = $derived(data.canEdit);
	const published = $derived(data.form.status === 'published');

	// Design controls edit a local copy; the stored form only changes on Save.
	// svelte-ignore state_referenced_locally
	let theme = $state<FormTheme>({ ...data.form.theme });
	// svelte-ignore state_referenced_locally
	let successMessage = $state(data.form.successMessage);
	// svelte-ignore state_referenced_locally
	let lastSaved = $state(JSON.stringify({ theme: { ...theme, logo: null }, successMessage }));
	const snapshot = $derived(JSON.stringify({ theme: { ...theme, logo: null }, successMessage }));
	const dirty = $derived(snapshot !== lastSaved);

	let busy = $state<string | null>(null);
	let logoBusy = $state(false);
	let logoError = $state<string | null>(null);
	let deleteOpen = $state(false);

	const message = $derived(form && 'message' in form ? form.message : null);
	const section = $derived(form && 'section' in form ? form.section : null);
	const saved = $derived(!!(form && 'saved' in form && form.saved));

	const track = (name: string) => () => {
		busy = name;
		return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
			busy = null;
			await update({ reset: false });
		};
	};
</script>

<svelte:head><title>Settings - {data.form.title} - Formwrite</title></svelte:head>

<Toast message={saved && section === 'design' ? 'Design saved' : null} />

<div class="mx-auto max-w-6xl space-y-5 px-4 py-6 md:px-8 md:py-8">
	<section class="card p-5">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h2 class="font-semibold">Status</h2>
				<p class="mt-0.5 text-sm text-stone-500">
					{#if published}
						Live and accepting responses. Anyone with the link can respond.
					{:else}
						Draft. Only workspace members can see this form.
					{/if}
				</p>
			</div>
			{#if canEdit}
				<form
					method="POST"
					action="?/{published ? 'unpublish' : 'publish'}"
					use:enhance={track('status')}
				>
					<button
						type="submit"
						class="btn {published ? 'btn-secondary' : 'btn-primary'}"
						disabled={busy === 'status'}
					>
						{#if published}
							<Icon name="lock" size={15} /> Unpublish
						{:else}
							<Icon name="send" size={15} /> Publish
						{/if}
					</button>
				</form>
			{/if}
		</div>
		{#if section === 'status' && message}
			<p class="alert-error mt-3" role="alert">
				<Icon name="alert-circle" size={16} class="mt-0.5" />{message}
			</p>
		{/if}
	</section>

	<section class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
		<form
			method="POST"
			action="?/design"
			class="card"
			use:enhance={() => {
				busy = 'design';
				const pending = snapshot;
				return async ({ result, update }) => {
					busy = null;
					if (result.type === 'success') lastSaved = pending;
					await update({ reset: false, invalidateAll: result.type === 'success' });
				};
			}}
		>
			<input type="hidden" name="theme" value={JSON.stringify(theme)} />
			<div class="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-5">
				<div>
					<h2 class="flex items-center gap-2 font-semibold">
						<Icon name="palette" size={16} class="text-brand-600" /> Design
					</h2>
					<p class="mt-0.5 text-sm text-stone-500">Applies to the public form page.</p>
				</div>
				{#if canEdit}
					<div class="flex items-center gap-3">
						<span class="text-xs text-stone-500">
							{#if dirty}
								<span class="inline-flex items-center gap-1.5 text-amber-700"
									><span class="size-1.5 rounded-full bg-amber-500"></span>Unsaved changes</span
								>
							{:else}
								All changes saved
							{/if}
						</span>
						<button type="submit" class="btn btn-primary" disabled={!dirty || busy === 'design'}>
							<Icon name="check" size={16} /> Save
						</button>
					</div>
				{/if}
			</div>

			<DesignPanel
				bind:theme
				fields={data.form.fields}
				disabled={!canEdit}
				logoUrl={data.logoUrl}
				{logoBusy}
				{logoError}
				logoFormId="logo-form"
				logoRemoveFormId="logo-remove-form"
			/>

			<div class="border-t border-stone-100 p-5">
				<label class="label" for="successMessage">Message after submitting</label>
				<input
					class="input"
					id="successMessage"
					name="successMessage"
					maxlength="500"
					bind:value={successMessage}
					placeholder="Thanks! Your response has been recorded."
					disabled={!canEdit}
				/>
			</div>

			{#if section === 'design' && message}
				<p class="alert-error mx-5 mb-5" role="alert">
					<Icon name="alert-circle" size={16} class="mt-0.5" />{message}
				</p>
			{/if}
		</form>

		<aside class="xl:sticky xl:top-6 xl:self-start">
			<div class="mb-2 flex items-center justify-between px-1">
				<h2 class="flex items-center gap-1.5 text-sm font-semibold">
					<Icon name="eye" size={14} /> Live preview
				</h2>
				<span class="text-xs text-stone-500">Updates as you change the design</span>
			</div>
			<div class="overflow-hidden rounded-2xl border border-stone-200">
				<FormPreview
					title={data.form.title}
					description={data.form.description}
					fields={data.form.fields}
					{theme}
					logoUrl={data.logoUrl}
				/>
			</div>
		</aside>
	</section>

	{#if canEdit}
		<section class="card border-red-200 p-5">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="font-semibold text-red-700">Delete this form</h2>
					<p class="mt-0.5 text-sm text-stone-500">
						Removes the form, all {data.responseCount} responses and uploaded files.
					</p>
				</div>
				<button type="button" class="btn btn-danger" onclick={() => (deleteOpen = true)}
					><Icon name="trash" size={15} /> Delete form</button
				>
			</div>
		</section>
	{/if}
</div>

{#if canEdit}
	<form
		id="logo-form"
		method="POST"
		action="?/logo"
		enctype="multipart/form-data"
		class="hidden"
		use:enhance={() => {
			logoBusy = true;
			logoError = null;
			return async ({ result, formElement }) => {
				logoBusy = false;
				formElement.reset();
				if (result.type === 'success' && result.data?.logo) {
					theme.logo = result.data.logo as FormLogo;
				} else if (result.type === 'failure') {
					logoError = String(result.data?.logoError ?? 'Could not upload the logo');
				} else if (result.type === 'error') {
					logoError = 'Could not upload the logo';
				}
			};
		}}
	></form>
	<form
		id="logo-remove-form"
		method="POST"
		action="?/removeLogo"
		class="hidden"
		use:enhance={() => {
			logoBusy = true;
			logoError = null;
			return async ({ result }) => {
				logoBusy = false;
				if (result.type === 'success') theme.logo = null;
				else if (result.type === 'failure') {
					logoError = String(result.data?.logoError ?? 'Could not remove the logo');
				}
			};
		}}
	></form>
{/if}

<Modal
	bind:open={deleteOpen}
	title="Delete this form?"
	description="Type the form title to confirm. This cannot be undone."
	size="sm"
>
	<form method="POST" action="?/delete" use:enhance={track('delete')} class="space-y-3">
		<input
			class="input"
			name="confirm"
			type="text"
			placeholder={data.form.title}
			autocomplete="off"
			required
		/>
		{#if section === 'delete' && message}
			<p class="text-sm text-red-700" role="alert">{message}</p>
		{/if}
		<div class="flex justify-end gap-2">
			<button type="button" class="btn btn-secondary" onclick={() => (deleteOpen = false)}
				>Cancel</button
			>
			<button type="submit" class="btn btn-danger" disabled={busy === 'delete'}
				>Delete permanently</button
			>
		</div>
	</form>
</Modal>
