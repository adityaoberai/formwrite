<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';
	import Logo from './Logo.svelte';

	let {
		step,
		title,
		subtitle,
		children
	}: { step: 1 | 2; title: string; subtitle: string; children: Snippet } = $props();
</script>

<div class="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
	<aside
		class="relative hidden overflow-hidden bg-ink text-white lg:flex lg:flex-col lg:justify-between lg:p-12"
	>
		<div
			class="pointer-events-none absolute -top-40 -left-40 size-[560px] rounded-full bg-brand-600/40 blur-3xl"
			aria-hidden="true"
		></div>
		<div
			class="pointer-events-none absolute -right-32 -bottom-32 size-[420px] rounded-full bg-brand-400/20 blur-3xl"
			aria-hidden="true"
		></div>
		<Logo light size="lg" />
		<div class="relative max-w-md">
			<h2 class="text-3xl font-semibold tracking-tight text-balance">
				Forms for teams that keep their data to themselves.
			</h2>
			<ul class="mt-8 space-y-4 text-sm text-stone-300">
				<li class="flex gap-3">
					<Icon name="shield-check" size={18} class="mt-0.5 text-brand-300" />
					<span
						>Every workspace keeps its forms, responses and files separate. Only members can see
						them.</span
					>
				</li>
				<li class="flex gap-3">
					<Icon name="key-round" size={18} class="mt-0.5 text-brand-300" />
					<span
						>No passwords to leak. Sign in with a one-time code and a security phrase you can
						verify.</span
					>
				</li>
				<li class="flex gap-3">
					<Icon name="server" size={18} class="mt-0.5 text-brand-300" />
					<span
						>Nothing sensitive is kept in your browser. Every page is prepared securely on our
						servers.</span
					>
				</li>
			</ul>
		</div>
		<p class="relative text-xs text-stone-400">
			Forms, responses and files, kept where they belong.
		</p>
	</aside>

	<main class="flex flex-col px-6 py-8 sm:px-12">
		<div class="flex items-center justify-between lg:justify-end">
			<span class="lg:hidden"><Logo /></span>
			<ol class="flex items-center gap-2 text-xs text-stone-500" aria-label="Sign-in progress">
				<li class="flex items-center gap-1.5 {step === 1 ? 'font-medium text-ink' : ''}">
					<span
						class="grid size-5 place-items-center rounded-full text-[10px] {step > 1
							? 'bg-emerald-100 text-emerald-700'
							: 'bg-ink text-white'}"
					>
						{#if step > 1}<Icon name="check" size={10} />{:else}1{/if}
					</span>
					Email
				</li>
				<li class="h-px w-6 bg-stone-300" aria-hidden="true"></li>
				<li class="flex items-center gap-1.5 {step === 2 ? 'font-medium text-ink' : ''}">
					<span
						class="grid size-5 place-items-center rounded-full text-[10px] {step === 2
							? 'bg-ink text-white'
							: 'bg-stone-200 text-stone-600'}">2</span
					>
					Code
				</li>
			</ol>
		</div>
		<div class="flex flex-1 items-center justify-center py-12">
			<div class="w-full max-w-sm animate-rise">
				<h1 class="text-2xl font-semibold tracking-tight">{title}</h1>
				<p class="mt-1.5 text-sm text-stone-600">{subtitle}</p>
				<div class="mt-8">
					{@render children()}
				</div>
			</div>
		</div>
		<p class="text-center text-xs text-stone-400 lg:text-right">
			By continuing you agree to use Formwrite responsibly.
		</p>
	</main>
</div>
