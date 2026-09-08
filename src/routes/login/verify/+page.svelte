<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthShell from '$lib/components/AuthShell.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let submitting = $state(false);
	let code = $state('');

	function onInput(e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		code = el.value.replace(/\D/g, '').slice(0, 6);
		el.value = code;
		if (code.length === 6) el.form?.requestSubmit();
	}
</script>

<svelte:head><title>Enter your code - Formwrite</title></svelte:head>

<AuthShell
	step={2}
	title="Check your inbox"
	subtitle="We sent a 6-digit code to {data.email}. It expires in 15 minutes."
>
	<div class="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
		<p class="text-xs font-medium tracking-wide text-amber-700">Security phrase</p>
		<p class="mt-0.5 text-base font-semibold text-amber-950">{data.phrase}</p>
		<p class="mt-1.5 text-xs text-amber-800">
			The email with your code shows this same phrase. If it doesn't match, ignore that email.
		</p>
	</div>

	<form
		method="POST"
		class="mt-6 space-y-4"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
	>
		<div>
			<label class="label" for="code">One-time code</label>
			<input
				class="input py-3 text-center font-mono text-2xl tracking-[0.5em]"
				id="code"
				name="code"
				inputmode="numeric"
				autocomplete="one-time-code"
				maxlength="12"
				required
				placeholder="······"
				oninput={onInput}
			/>
		</div>
		{#if form?.message}
			<p class="alert-error" role="alert">
				<Icon name="alert-circle" size={16} class="mt-0.5" />{form.message}
			</p>
		{/if}
		<button class="btn btn-primary w-full py-2.5" type="submit" disabled={submitting}>
			{submitting ? 'Verifying...' : 'Continue'}
		</button>
	</form>
	<p class="mt-6 text-center text-sm text-stone-500">
		Wrong address or no email?
		<a
			class="font-medium text-brand-700 hover:underline"
			href="/login?next={encodeURIComponent(data.next)}">Start over</a
		>
	</p>
</AuthShell>
