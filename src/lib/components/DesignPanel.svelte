<script lang="ts">
	import Icon from './Icon.svelte';
	import {
		ACCENT_PRESETS,
		BACKGROUND_LABELS,
		FONT_LABELS,
		LAYOUT_LABELS,
		LOGO_SIZE_LABELS,
		RADIUS_LABELS,
		backgroundStyle,
		LOGO_MAX_WIDTH_CLASS,
		logoHeightClass,
		splitSteps
	} from '$lib/theme';
	import {
		THEME_BACKGROUNDS,
		THEME_FONTS,
		THEME_LAYOUTS,
		THEME_LOGO_SIZES,
		THEME_RADII,
		type FormField,
		type FormTheme
	} from '$lib/types';

	/**
	 * Theme controls for a form. The theme is bound so the parent can serialise it into its save
	 * form; the logo is uploaded through the separate `logoFormId` / `logoRemoveFormId` forms.
	 */
	let {
		theme = $bindable(),
		fields,
		disabled = false,
		logoUrl = '',
		logoBusy = false,
		logoError = null,
		logoFormId,
		logoRemoveFormId
	}: {
		theme: FormTheme;
		fields: FormField[];
		disabled?: boolean;
		logoUrl?: string;
		logoBusy?: boolean;
		logoError?: string | null;
		logoFormId: string;
		logoRemoveFormId: string;
	} = $props();

	const LOGO_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';

	const sectionCount = $derived(fields.filter((f) => f.type === 'section').length);
	const steps = $derived(splitSteps(fields));
	const stepped = $derived(theme.layout === 'steps' && steps.length > 1);
	const isPreset = $derived(ACCENT_PRESETS.some((p) => p.value === theme.accent));

	function submitLogo(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		if (input.files?.length) input.form?.requestSubmit();
	}
</script>

{#snippet segmented(
	name: string,
	options: readonly string[],
	labels: Record<string, string>,
	current: string,
	set: (v: string) => void
)}
	<div
		class="grid gap-1 rounded-lg bg-stone-100 p-1"
		style="grid-template-columns: repeat({options.length}, minmax(0, 1fr))"
		role="radiogroup"
		aria-label={name}
	>
		{#each options as opt (opt)}
			<button
				type="button"
				role="radio"
				aria-checked={current === opt}
				class="rounded-md px-2 py-1.5 text-xs font-medium transition {current === opt
					? 'bg-white text-ink shadow-card'
					: 'text-stone-600 hover:text-ink'}"
				onclick={() => set(opt)}
				{disabled}
			>
				{labels[opt]}
			</button>
		{/each}
	</div>
{/snippet}

<div class="divide-y divide-stone-100">
	<div class="p-5">
		<h3 class="text-sm font-semibold">Logo</h3>
		<p class="help mt-0.5">Shown above the form title. PNG, JPG, WebP, GIF or SVG up to 2 MB.</p>
		<div class="mt-3 flex flex-wrap items-center gap-4">
			{#if theme.logo}
				<img
					src="{logoUrl}?v={theme.logo.fileId}"
					alt="Current logo"
					class="box-content rounded-md border border-stone-200 bg-white object-contain p-1.5 {LOGO_MAX_WIDTH_CLASS} {logoHeightClass[
						theme.logoSize
					]}"
				/>
				<div class="flex items-center gap-2">
					<label
						class="btn btn-secondary btn-sm cursor-pointer {disabled || logoBusy
							? 'pointer-events-none opacity-50'
							: ''}"
					>
						<Icon name="upload" size={14} />
						{logoBusy ? 'Uploading...' : 'Replace'}
						<input
							type="file"
							form={logoFormId}
							name="logo"
							accept={LOGO_ACCEPT}
							class="sr-only"
							onchange={submitLogo}
							disabled={disabled || logoBusy}
						/>
					</label>
					<button
						type="submit"
						form={logoRemoveFormId}
						class="btn btn-ghost btn-sm text-red-700"
						disabled={disabled || logoBusy}
					>
						<Icon name="trash" size={14} /> Remove
					</button>
				</div>
			{:else}
				<label
					class="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-600 transition hover:border-brand-300 hover:bg-brand-50/40 {disabled
						? 'pointer-events-none opacity-50'
						: ''}"
				>
					<span class="grid size-9 place-items-center rounded-lg bg-stone-100 text-stone-500"
						><Icon name="upload" size={16} /></span
					>
					<span>
						<span class="block font-medium text-ink"
							>{logoBusy ? 'Uploading...' : 'Upload a logo'}</span
						>
						<span class="block text-xs text-stone-500">Square or wide images work best.</span>
					</span>
					<input
						type="file"
						form={logoFormId}
						name="logo"
						accept={LOGO_ACCEPT}
						class="sr-only"
						onchange={submitLogo}
						disabled={disabled || logoBusy}
					/>
				</label>
			{/if}
		</div>
		{#if theme.logo}
			<div class="mt-4 max-w-xs">
				<h4 class="label">Logo size</h4>
				{@render segmented(
					'Logo size',
					THEME_LOGO_SIZES,
					LOGO_SIZE_LABELS,
					theme.logoSize,
					(v) => (theme.logoSize = v as FormTheme['logoSize'])
				)}
			</div>
		{/if}
		{#if logoError}
			<p class="alert-error mt-3" role="alert">
				<Icon name="alert-circle" size={16} class="mt-0.5" />{logoError}
			</p>
		{/if}
	</div>

	<div class="p-5">
		<h3 class="text-sm font-semibold">Accent color</h3>
		<p class="help mt-0.5">Used for the header bar, buttons, focus rings and choices.</p>
		<div class="mt-3 flex flex-wrap items-center gap-2">
			{#each ACCENT_PRESETS as preset (preset.value)}
				<button
					type="button"
					class="grid size-8 place-items-center rounded-full ring-2 ring-offset-2 transition hover:scale-105 {theme.accent ===
					preset.value
						? 'ring-ink'
						: 'ring-transparent'}"
					style="background:{preset.value}"
					title={preset.name}
					aria-label={preset.name}
					aria-pressed={theme.accent === preset.value}
					onclick={() => (theme.accent = preset.value)}
					{disabled}
				>
					{#if theme.accent === preset.value}<Icon
							name="check"
							size={14}
							class="text-white mix-blend-difference"
						/>{/if}
				</button>
			{/each}
			<label
				class="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-stone-400 ring-2 ring-offset-2 {isPreset
					? 'ring-transparent'
					: 'ring-ink'}"
				title="Custom color"
				style={isPreset ? '' : `background:${theme.accent}`}
			>
				<input
					type="color"
					class="absolute inset-0 size-full cursor-pointer opacity-0"
					bind:value={theme.accent}
					{disabled}
					aria-label="Custom accent color"
				/>
				{#if isPreset}<Icon name="plus" size={14} class="text-stone-500" />{/if}
			</label>
			<span class="ml-1 font-mono text-xs text-stone-500">{theme.accent}</span>
		</div>
	</div>

	<div class="p-5">
		<h3 class="text-sm font-semibold">Background</h3>
		<div class="mt-3 grid grid-cols-4 gap-2">
			{#each THEME_BACKGROUNDS as bg (bg)}
				<button
					type="button"
					class="group text-left"
					onclick={() => (theme.background = bg)}
					aria-pressed={theme.background === bg}
					{disabled}
				>
					<span
						class="block h-14 overflow-hidden rounded-lg border-2 transition {theme.background ===
						bg
							? 'border-ink'
							: 'border-stone-200 group-hover:border-stone-400'}"
						style={backgroundStyle({ ...theme, background: bg })}
					>
						<span class="mx-auto mt-3 block h-full w-2/3 rounded-t-md bg-white shadow-card"
							><span class="block h-1 rounded-t-md" style="background:{theme.accent}"></span></span
						>
					</span>
					<span
						class="mt-1 block text-center text-xs {theme.background === bg
							? 'font-medium text-ink'
							: 'text-stone-600'}">{BACKGROUND_LABELS[bg]}</span
					>
				</button>
			{/each}
		</div>
	</div>

	<div class="grid gap-5 p-5 sm:grid-cols-2">
		<div>
			<h3 class="mb-2 text-sm font-semibold">Corners</h3>
			{@render segmented(
				'Corners',
				THEME_RADII,
				RADIUS_LABELS,
				theme.radius,
				(v) => (theme.radius = v as FormTheme['radius'])
			)}
		</div>
		<div>
			<h3 class="mb-2 text-sm font-semibold">Font</h3>
			{@render segmented(
				'Font',
				THEME_FONTS,
				FONT_LABELS,
				theme.font,
				(v) => (theme.font = v as FormTheme['font'])
			)}
		</div>
	</div>

	<div class="p-5">
		<h3 class="text-sm font-semibold">Layout</h3>
		<p class="help mt-0.5">
			{#if sectionCount === 0}
				Add a section in the builder to split the form into steps.
			{:else if stepped}
				Respondents move through {steps.length} steps with a progress bar.
			{:else}
				All {sectionCount} section{sectionCount === 1 ? '' : 's'} appear on one page.
			{/if}
		</p>
		<div class="mt-3">
			{@render segmented(
				'Layout',
				THEME_LAYOUTS,
				LAYOUT_LABELS,
				theme.layout,
				(v) => (theme.layout = v as FormTheme['layout'])
			)}
		</div>
	</div>

	<div class="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-end">
		<div>
			<label class="label" for="submitLabel">Submit button label</label>
			<input
				class="input"
				id="submitLabel"
				maxlength="40"
				bind:value={theme.submitLabel}
				placeholder="Submit"
				{disabled}
			/>
		</div>
		<label class="flex items-center gap-2 pb-2 text-sm text-stone-700">
			<input
				type="checkbox"
				class="rounded border-stone-300 text-brand-600 focus:ring-brand-500"
				bind:checked={theme.showBranding}
				{disabled}
			/>
			Show "Powered by Formwrite"
		</label>
	</div>
</div>
