<script lang="ts">
	import { enhance } from '$app/forms';
	import FormEditor from '$lib/components/FormEditor.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { plural } from '$lib/format';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let copied = $state(false);
	let publishing = $state(false);

	const base = $derived(`/app/${data.workspace.id}`);
	const published = $derived(data.form.status === 'published');

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(data.publicUrl);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			copied = false;
		}
	}
</script>

<svelte:head><title>{data.form.title} - Formwrite</title></svelte:head>

<Toast message={form?.saved ? 'Changes saved' : null} />

<nav class="mb-4 flex items-center gap-1.5 text-sm text-stone-500" aria-label="Breadcrumb">
	<a href={base} class="hover:text-ink">Forms</a>
	<Icon name="chevron-right" size={14} class="text-stone-300" />
	<span class="truncate font-medium text-ink">{data.form.title}</span>
</nav>

<div class="card mb-6 flex flex-wrap items-center gap-4 p-4">
	<div class="flex min-w-0 flex-1 items-center gap-3">
		<span
			class="grid size-10 shrink-0 place-items-center rounded-xl {published
				? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
				: 'bg-stone-100 text-stone-500'} ring-inset"
		>
			<Icon name={published ? 'globe' : 'lock'} size={18} />
		</span>
		<div class="min-w-0">
			<div class="flex items-center gap-2">
				<h1 class="truncate text-lg font-semibold tracking-tight">{data.form.title}</h1>
				<StatusBadge status={data.form.status} />
			</div>
			<p class="text-sm text-stone-500">
				{published
					? 'Anyone with the link can respond.'
					: 'Only workspace members can see this form.'}
				<a
					href="{base}/forms/{data.form.id}/submissions"
					class="font-medium text-ink hover:underline">{plural(data.submissionCount, 'response')}</a
				>
			</p>
		</div>
	</div>

	<div class="flex flex-wrap items-center gap-2">
		{#if published}
			<div
				class="flex items-center overflow-hidden rounded-lg border border-stone-300 bg-white shadow-xs"
			>
				<span class="hidden max-w-[260px] truncate px-3 py-2 text-xs text-stone-600 sm:block"
					>{data.publicUrl}</span
				>
				<button
					class="btn btn-ghost rounded-none border-l border-stone-200 px-3 py-2 text-xs"
					type="button"
					onclick={copyLink}
				>
					<Icon
						name={copied ? 'check' : 'copy'}
						size={14}
						class={copied ? 'text-emerald-600' : ''}
					/>
					{copied ? 'Copied' : 'Copy link'}
				</button>
			</div>
		{/if}
		<a class="btn btn-secondary" href={data.publicUrl} target="_blank" rel="noopener">
			<Icon name="external-link" size={14} />
			{published ? 'Open' : 'Preview'}
		</a>
		{#if data.canEdit}
			<form
				method="POST"
				action="?/publish"
				use:enhance={() => {
					publishing = true;
					return async ({ update }) => {
						publishing = false;
						await update();
					};
				}}
			>
				<input type="hidden" name="status" value={published ? 'draft' : 'published'} />
				<button
					class="btn {published ? 'btn-secondary' : 'btn-primary'}"
					type="submit"
					disabled={publishing}
				>
					<Icon name={published ? 'lock' : 'send'} size={14} />
					{publishing ? 'Updating...' : published ? 'Unpublish' : 'Publish form'}
				</button>
			</form>
		{/if}
	</div>
</div>

{#key data.form.updatedAt}
	<FormEditor
		initial={{
			title: data.form.title,
			description: data.form.description,
			successMessage: data.form.successMessage,
			fields: data.form.fields,
			theme: data.form.theme
		}}
		disabled={!data.canEdit}
		error={form?.message ?? null}
		saved={!!form?.saved}
	/>
{/key}
