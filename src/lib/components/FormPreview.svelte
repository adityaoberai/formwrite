<script lang="ts">
	import FieldInput from './FieldInput.svelte';
	import {
		backgroundStyle,
		buttonRadiusClass,
		cardRadiusClass,
		fontClass,
		isDarkBackground,
		LOGO_MAX_WIDTH_CLASS,
		logoHeightClass,
		splitSteps,
		themeVars
	} from '$lib/theme';
	import type { FormField, FormTheme } from '$lib/types';

	/**
	 * Renders the form the way respondents will see it, using the same theme code path as the
	 * public page. Controls are inert so the preview never submits anything.
	 */
	let {
		title,
		description = '',
		fields,
		theme,
		logoUrl = '',
		padded = true
	}: {
		title: string;
		description?: string;
		fields: FormField[];
		theme: FormTheme;
		logoUrl?: string;
		padded?: boolean;
	} = $props();

	const steps = $derived(splitSteps(fields));
	const stepped = $derived(theme.layout === 'steps' && steps.length > 1);
	const hasRequired = $derived(fields.some((f) => f.required));
</script>

<div
	class="fw-theme {padded ? 'p-4 sm:p-8' : 'p-4'} {fontClass[theme.font]}"
	style="{themeVars(theme)};{backgroundStyle(theme)}"
>
	<div
		class="mx-auto max-w-xl overflow-hidden border border-black/5 bg-white shadow-pop {cardRadiusClass[
			theme.radius
		]}"
		inert
	>
		<div class="bg-accent h-2"></div>
		<div class="p-6 sm:p-8">
			{#if stepped}
				<div class="mb-5 flex items-center gap-3 text-xs text-stone-500">
					<span class="whitespace-nowrap">Step 1 of {steps.length}</span>
					<span class="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200"
						><span class="bg-accent block h-full" style="width:{100 / steps.length}%"></span></span
					>
				</div>
			{/if}
			{#if theme.logo}
				<img
					src="{logoUrl}?v={theme.logo.fileId}"
					alt=""
					class="mb-5 w-auto object-contain object-left {LOGO_MAX_WIDTH_CLASS} {logoHeightClass[
						theme.logoSize
					]}"
				/>
			{/if}
			<h1 class="text-2xl font-semibold tracking-tight {title ? '' : 'text-stone-400'}">
				{title || 'Untitled form'}
			</h1>
			{#if description}
				<p class="mt-2 text-sm whitespace-pre-line text-stone-600">{description}</p>
			{/if}
			{#if hasRequired}
				<p class="mt-3 text-xs text-stone-500"><span class="text-red-600">*</span> Required</p>
			{/if}
			<div class="mt-6 space-y-5">
				{#if stepped && steps[0].title}
					<div>
						<h2 class="text-lg font-semibold tracking-tight">{steps[0].title}</h2>
						{#if steps[0].description}
							<p class="mt-1 text-sm whitespace-pre-line text-stone-600">{steps[0].description}</p>
						{/if}
					</div>
				{/if}
				{#each stepped ? steps[0].fields : fields as field (field.id)}
					<FieldInput {field} />
				{/each}
				{#if fields.length === 0}
					<p class="text-sm text-stone-400">Your questions will appear here.</p>
				{/if}
			</div>
			<div class="mt-6 flex items-center justify-between gap-3">
				<span class="btn btn-accent px-5 py-2.5 {buttonRadiusClass[theme.radius]}">
					{stepped ? 'Next' : theme.submitLabel || 'Submit'}
				</span>
				<span class="text-xs text-stone-400">Stored privately for this team</span>
			</div>
		</div>
	</div>
	{#if theme.showBranding}
		<p
			class="mt-6 text-center text-xs {isDarkBackground(theme)
				? 'text-white/60'
				: 'text-stone-400'}"
		>
			Powered by Formwrite
		</p>
	{/if}
</div>
