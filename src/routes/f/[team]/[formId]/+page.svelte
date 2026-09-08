<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import FieldInput from '$lib/components/FieldInput.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import {
		backgroundStyle,
		buttonRadiusClass,
		cardRadiusClass,
		fontClass,
		isDarkBackground,
		logoHeightClass,
		splitSteps,
		themeVars
	} from '$lib/theme';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let submitting = $state(false);
	let hydrated = $state(false);
	let step = $state(0);

	const theme = $derived(data.form.theme);
	const steps = $derived(splitSteps(data.form.fields));
	const stepped = $derived(theme.layout === 'steps' && steps.length > 1);
	const hasFiles = $derived(data.form.fields.some((f) => f.type === 'file'));
	const hasRequired = $derived(data.form.fields.some((f) => f.required));
	const success = $derived(!!(form && 'success' in form && form.success));
	const errors = $derived<Record<string, string>>((form && 'errors' in form && form.errors) || {});
	const values = $derived<Record<string, string | string[]>>(
		(form && 'values' in form && form.values) || {}
	);
	const errorCount = $derived(Object.keys(errors).length);
	const firstErrorStep = $derived(
		steps.findIndex((s) => s.fields.some((f) => errors[f.id] !== undefined))
	);
	const dark = $derived(isDarkBackground(theme));

	// Stepping is a progressive enhancement: the server renders every step so the form works without JS.
	onMount(() => {
		hydrated = true;
	});
	$effect(() => {
		if (firstErrorStep >= 0) step = firstErrorStep;
	});

	function controlsIn(index: number) {
		return Array.from(
			document.querySelectorAll<HTMLInputElement>(
				`#step-${index} input, #step-${index} select, #step-${index} textarea`
			)
		);
	}
	function stepIsValid(index: number) {
		for (const c of controlsIn(index)) {
			if (!c.checkValidity()) {
				c.reportValidity();
				return false;
			}
		}
		return true;
	}
	function next() {
		if (stepIsValid(step)) {
			step = Math.min(step + 1, steps.length - 1);
			document.getElementById('form-top')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
		}
	}
	function back() {
		step = Math.max(step - 1, 0);
	}
</script>

<svelte:head>
	<title>{data.form.title}</title>
	<meta name="robots" content="noindex" />
	<meta name="theme-color" content={theme.accent} />
</svelte:head>

<div
	class="fw-theme min-h-screen px-4 py-10 sm:py-16 {fontClass[theme.font]}"
	style="{themeVars(theme)};{backgroundStyle(theme)}"
>
	<main class="mx-auto w-full max-w-xl animate-rise" id="form-top">
		<div
			class="overflow-hidden border border-black/5 bg-white shadow-pop {cardRadiusClass[
				theme.radius
			]}"
		>
			<div class="bg-accent h-2"></div>
			<div class="p-6 sm:p-8">
				{#if theme.logo}
					<img
						src="{data.logoUrl}?v={theme.logo.fileId}"
						alt=""
						class="mb-5 w-auto max-w-[260px] object-contain object-left {logoHeightClass[
							theme.logoSize
						]}"
					/>
				{/if}
				{#if success}
					<div class="py-6 text-center">
						<div
							class="bg-accent mx-auto grid size-16 animate-pop place-items-center rounded-full text-white"
							style="color: var(--fw-accent-fg)"
						>
							<Icon name="check" size={30} strokeWidth={2.5} />
						</div>
						<h1 class="mt-5 text-2xl font-semibold tracking-tight">Response sent</h1>
						<p class="mt-2 text-stone-600">{data.form.successMessage}</p>
						<a
							class="btn btn-secondary mt-8 {buttonRadiusClass[theme.radius]}"
							href="?"
							data-sveltekit-reload>Submit another response</a
						>
					</div>
				{:else}
					{#if stepped && hydrated}
						<div class="mb-5 flex items-center gap-3 text-xs text-stone-500">
							<span class="whitespace-nowrap">Step {step + 1} of {steps.length}</span>
							<span
								class="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200"
								role="progressbar"
								aria-valuemin={1}
								aria-valuemax={steps.length}
								aria-valuenow={step + 1}
							>
								<span
									class="bg-accent block h-full transition-[width] duration-300"
									style="width:{((step + 1) / steps.length) * 100}%"
								></span>
							</span>
						</div>
					{/if}

					{#if !stepped || !hydrated || step === 0}
						<h1 class="text-2xl font-semibold tracking-tight">{data.form.title}</h1>
						{#if data.form.description}
							<p class="mt-2 text-sm whitespace-pre-line text-stone-600">{data.form.description}</p>
						{/if}
						{#if hasRequired}
							<p class="mt-3 text-xs text-stone-500">
								<span class="text-red-600">*</span> Required
							</p>
						{/if}
					{/if}

					<form
						method="POST"
						enctype={hasFiles ? 'multipart/form-data' : undefined}
						class="mt-6 space-y-5"
						novalidate={errorCount > 0 || (stepped && hydrated) ? true : undefined}
						use:enhance={({ cancel }) => {
							if (stepped) {
								for (let i = 0; i < steps.length; i++) {
									if (!stepIsValid(i)) {
										step = i;
										cancel();
										return;
									}
								}
							}
							submitting = true;
							return async ({ update }) => {
								submitting = false;
								await update({ reset: false });
							};
						}}
					>
						{#if form && 'message' in form && form.message}
							<p class="alert-error" role="alert">
								<Icon name="alert-circle" size={16} class="mt-0.5" />
								<span>
									{form.message}
									{#if errorCount > 0}
										({errorCount} {errorCount === 1 ? 'field needs' : 'fields need'} attention)
									{/if}
								</span>
							</p>
						{/if}

						{#each steps as s, i (i)}
							<section id="step-{i}" class="space-y-5" hidden={stepped && hydrated && i !== step}>
								{#if s.title}
									<div
										class={i > 0 && !(stepped && hydrated)
											? 'border-t border-stone-200/80 pt-5'
											: ''}
									>
										<h2 class="text-lg font-semibold tracking-tight">{s.title}</h2>
										{#if s.description}
											<p class="mt-1 text-sm whitespace-pre-line text-stone-600">{s.description}</p>
										{/if}
									</div>
								{/if}
								{#each s.fields as field (field.id)}
									<FieldInput
										{field}
										value={values[field.id] ?? ''}
										error={errors[field.id] ?? ''}
									/>
								{/each}
							</section>
						{/each}

						{#if data.form.fields.length > 0}
							<div class="flex items-center justify-between gap-3 pt-2">
								{#if stepped && hydrated}
									<div class="flex gap-2">
										{#if step > 0}
											<button
												class="btn btn-secondary {buttonRadiusClass[theme.radius]}"
												type="button"
												onclick={back}
											>
												<Icon name="arrow-left" size={14} /> Back
											</button>
										{/if}
										{#if step < steps.length - 1}
											<button
												class="btn btn-accent px-5 {buttonRadiusClass[theme.radius]}"
												type="button"
												onclick={next}
											>
												Next <Icon name="arrow-right" size={16} />
											</button>
										{:else}
											<button
												class="btn btn-accent px-5 {buttonRadiusClass[theme.radius]}"
												type="submit"
												disabled={submitting}
											>
												{#if submitting}Sending...{:else}{theme.submitLabel}
													<Icon name="arrow-right" size={16} />{/if}
											</button>
										{/if}
									</div>
								{:else}
									<button
										class="btn btn-accent px-5 py-2.5 {buttonRadiusClass[theme.radius]}"
										type="submit"
										disabled={submitting}
									>
										{#if submitting}Sending...{:else}{theme.submitLabel}
											<Icon name="arrow-right" size={16} />{/if}
									</button>
								{/if}
								<span class="flex items-center gap-1 text-xs text-stone-400">
									<Icon name="lock" size={12} /> Stored privately for this team
								</span>
							</div>
						{:else}
							<p class="text-sm text-stone-500">This form has no questions yet.</p>
						{/if}
					</form>
				{/if}
			</div>
		</div>
		{#if theme.showBranding}
			<p
				class="mt-8 flex items-center justify-center gap-1.5 text-xs {dark
					? 'text-white/60'
					: 'text-stone-400'}"
			>
				Powered by
				<a
					href="/"
					class="inline-flex items-center gap-1 font-medium {dark
						? 'text-white/80 hover:text-white'
						: 'text-stone-500 hover:text-ink'}"
				>
					<svg viewBox="0 0 64 64" class="size-3.5" aria-hidden="true">
						<rect width="64" height="64" rx="16" fill="#4f46e5" />
						<path d="M20 16h26v8H29v8h14v8H29v8h-9z" fill="#fff" />
					</svg>
					Formwrite
				</a>
			</p>
		{/if}
	</main>
</div>
