<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthShell from '$lib/components/AuthShell.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let submitting = $state(false);
</script>

<svelte:head><title>Sign in - Formwrite</title></svelte:head>

<AuthShell
	step={1}
	title="Welcome to Formwrite"
	subtitle="Enter your email and we'll send a one-time code. New here? The same step creates your account."
>
	<form
		method="POST"
		class="space-y-4"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
	>
		<input type="hidden" name="next" value={data.next} />
		<div>
			<label class="label" for="email">Work email</label>
			<div class="relative">
				<Icon
					name="mail"
					size={16}
					class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400"
				/>
				<input
					class="input pl-9"
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					required
					value={form?.email ?? ''}
					placeholder="you@company.com"
				/>
			</div>
		</div>
		{#if form?.message}
			<p class="alert-error" role="alert">
				<Icon name="alert-circle" size={16} class="mt-0.5" />{form.message}
			</p>
		{/if}
		<button class="btn btn-primary w-full py-2.5" type="submit" disabled={submitting}>
			{#if submitting}Sending code...{:else}Send code <Icon name="arrow-right" size={16} />{/if}
		</button>
	</form>
	<p class="mt-6 flex items-start gap-2 text-xs text-stone-500">
		<Icon name="lock" size={14} class="mt-0.5 shrink-0" />
		Codes expire after 15 minutes and can be used once.
	</p>
</AuthShell>
