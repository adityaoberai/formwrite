<script lang="ts">
	import { enhance } from '$app/forms';
	import FieldInput from './FieldInput.svelte';
	import Icon, { type IconName } from './Icon.svelte';
	import {
		ACCENT_PRESETS,
		BACKGROUND_LABELS,
		FONT_LABELS,
		LAYOUT_LABELS,
		RADIUS_LABELS,
		backgroundStyle,
		buttonRadiusClass,
		cardRadiusClass,
		fontClass,
		isDarkBackground,
		splitSteps,
		themeVars
	} from '$lib/theme';
	import {
		FIELD_TYPES,
		FIELD_TYPE_LABELS,
		FIELD_TYPES_WITH_OPTIONS,
		THEME_BACKGROUNDS,
		THEME_FONTS,
		THEME_LAYOUTS,
		THEME_RADII,
		type FieldType,
		type FormField,
		type FormTheme
	} from '$lib/types';

	interface Initial {
		title: string;
		description: string;
		successMessage: string;
		fields: FormField[];
		theme: FormTheme;
	}

	let {
		initial,
		disabled = false,
		error = null,
		saved = false
	}: { initial: Initial; disabled?: boolean; error?: string | null; saved?: boolean } = $props();

	type EditableField = Omit<FormField, 'options'> & { optionsText: string };

	const FIELD_ICONS: Record<FieldType, IconName> = {
		text: 'type',
		textarea: 'align-left',
		email: 'mail',
		number: 'hash',
		date: 'calendar',
		select: 'chevrons-up-down',
		radio: 'circle-dot',
		checkbox: 'check-square',
		file: 'paperclip',
		section: 'heading'
	};
	const QUESTION_TYPES = FIELD_TYPES.filter((t) => t !== 'section');

	const hasOptions = (type: FieldType) => FIELD_TYPES_WITH_OPTIONS.includes(type);
	const newId = () => `q_${Math.random().toString(36).slice(2, 10)}`;
	const toEditable = (f: FormField): EditableField => ({
		id: f.id,
		type: f.type,
		label: f.label,
		placeholder: f.placeholder ?? '',
		helpText: f.helpText ?? '',
		required: f.required,
		optionsText: (f.options ?? []).join('\n')
	});
	const toField = ({ optionsText, ...f }: EditableField): FormField => ({
		...f,
		required: f.type === 'section' ? false : f.required,
		options: hasOptions(f.type)
			? optionsText
					.split('\n')
					.map((o) => o.trim())
					.filter(Boolean)
			: undefined
	});

	// svelte-ignore state_referenced_locally
	let title = $state(initial.title);
	// svelte-ignore state_referenced_locally
	let description = $state(initial.description);
	// svelte-ignore state_referenced_locally
	let successMessage = $state(initial.successMessage);
	// svelte-ignore state_referenced_locally
	let fields = $state<EditableField[]>(initial.fields.map(toEditable));
	// svelte-ignore state_referenced_locally
	let theme = $state<FormTheme>({ ...initial.theme });
	let expanded = $state<string | null>(null);
	let saving = $state(false);
	let panel = $state<'questions' | 'design'>('questions');

	const previewFields = $derived(fields.map(toField));
	const serialized = $derived(JSON.stringify(previewFields));
	const serializedTheme = $derived(JSON.stringify(theme));
	const snapshot = $derived(
		JSON.stringify({ title, description, successMessage, serialized, serializedTheme })
	);
	// svelte-ignore state_referenced_locally
	const baseline = JSON.stringify({
		title: initial.title,
		description: initial.description,
		successMessage: initial.successMessage,
		serialized: JSON.stringify(initial.fields.map((f) => toField(toEditable(f)))),
		serializedTheme: JSON.stringify(initial.theme)
	});
	const dirty = $derived(snapshot !== baseline);

	const sectionCount = $derived(fields.filter((f) => f.type === 'section').length);
	const questionCount = $derived(fields.length - sectionCount);
	const steps = $derived(splitSteps(previewFields));
	const stepped = $derived(theme.layout === 'steps' && steps.length > 1);
	const isPreset = $derived(ACCENT_PRESETS.some((p) => p.value === theme.accent));

	function add(type: FieldType) {
		const field: EditableField = {
			id: newId(),
			type,
			label: '',
			placeholder: '',
			helpText: '',
			required: false,
			optionsText: hasOptions(type) ? 'Option 1\nOption 2' : ''
		};
		fields.push(field);
		expanded = field.id;
		queueMicrotask(() => document.getElementById(`label-${field.id}`)?.focus());
	}
	function duplicate(index: number) {
		const copy = { ...fields[index], id: newId() };
		fields.splice(index + 1, 0, copy);
		expanded = copy.id;
	}
	function remove(index: number) {
		fields.splice(index, 1);
	}
	function move(index: number, delta: number) {
		const target = index + delta;
		if (target < 0 || target >= fields.length) return;
		const [item] = fields.splice(index, 1);
		fields.splice(target, 0, item);
	}
	function onKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
			e.preventDefault();
			if (!disabled && dirty)
				document.querySelector<HTMLFormElement>('#editor-form')?.requestSubmit();
		}
	}
	function onBeforeUnload(e: BeforeUnloadEvent) {
		if (dirty) e.preventDefault();
	}
</script>

<svelte:window onkeydown={onKeydown} onbeforeunload={onBeforeUnload} />

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

<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
	<form
		id="editor-form"
		method="POST"
		action="?/save"
		class="space-y-5"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				saving = false;
				await update({ reset: false });
			};
		}}
	>
		<input type="hidden" name="fields" value={serialized} />
		<input type="hidden" name="theme" value={serializedTheme} />

		<section class="card p-5">
			<div>
				<label class="label" for="title">Form title</label>
				<input
					class="input text-base font-medium"
					id="title"
					name="title"
					required
					maxlength="200"
					bind:value={title}
					{disabled}
				/>
			</div>
			<div class="mt-4">
				<label class="label" for="description"
					>Description <span class="font-normal text-stone-400">(optional)</span></label
				>
				<textarea
					class="input"
					id="description"
					name="description"
					rows="2"
					maxlength="2000"
					placeholder="Shown at the top of the form"
					bind:value={description}
					{disabled}></textarea>
			</div>
		</section>

		<div
			class="flex gap-1 rounded-xl bg-stone-200/60 p-1 text-sm"
			role="tablist"
			aria-label="Editor panels"
		>
			<button
				type="button"
				role="tab"
				aria-selected={panel === 'questions'}
				class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-medium {panel ===
				'questions'
					? 'bg-white shadow-card'
					: 'text-stone-600'}"
				onclick={() => (panel = 'questions')}
			>
				<Icon name="list-ordered" size={14} /> Questions
				<span class="rounded-full bg-stone-200 px-1.5 text-xs text-stone-600">{questionCount}</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={panel === 'design'}
				class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-medium {panel ===
				'design'
					? 'bg-white shadow-card'
					: 'text-stone-600'}"
				onclick={() => (panel = 'design')}
			>
				<Icon name="palette" size={14} /> Design
			</button>
		</div>

		{#if panel === 'questions'}
			<section class="animate-rise">
				<div class="mb-2 flex items-center justify-between px-1">
					<p class="text-xs text-stone-500">
						{questionCount} question{questionCount === 1 ? '' : 's'}{#if sectionCount > 0}, {sectionCount}
							section{sectionCount === 1 ? '' : 's'}{/if}
					</p>
					{#if !disabled && fields.length > 0}
						<button type="button" class="btn btn-ghost btn-sm" onclick={() => (expanded = null)}
							>Collapse all</button
						>
					{/if}
				</div>

				<ol class="space-y-2">
					{#each fields as field, i (field.id)}
						{@const open = expanded === field.id}
						{@const section = field.type === 'section'}
						<li
							class="card overflow-hidden transition {open
								? 'ring-2 ring-brand-500/20'
								: ''} {section ? 'border-l-4 border-l-brand-400' : ''}"
						>
							<div class="flex items-center gap-2 px-3 py-2.5">
								<span class="text-stone-300" aria-hidden="true"
									><Icon name="grip" size={16} strokeWidth={3} /></span
								>
								<span
									class="grid size-7 place-items-center rounded-md {section
										? 'bg-brand-50 text-brand-700'
										: 'bg-stone-100 text-stone-600'}"
									title={FIELD_TYPE_LABELS[field.type]}
								>
									<Icon name={FIELD_ICONS[field.type]} size={14} />
								</span>
								<button
									type="button"
									class="min-w-0 flex-1 truncate text-left text-sm font-medium {field.label
										? 'text-ink'
										: 'text-stone-400'}"
									onclick={() => (expanded = open ? null : field.id)}
									aria-expanded={open}
								>
									{#if section}<span
											class="mr-1.5 text-[10px] font-semibold tracking-wide text-brand-700 uppercase"
											>Section</span
										>{/if}
									{field.label || (section ? 'Untitled section' : `Question ${i + 1}`)}
									{#if field.required && !section}<span class="text-red-500">*</span>{/if}
								</button>
								<div class="flex items-center gap-0.5">
									<button
										class="btn btn-ghost btn-icon"
										type="button"
										onclick={() => move(i, -1)}
										disabled={disabled || i === 0}
										aria-label="Move up"><Icon name="arrow-up" size={14} /></button
									>
									<button
										class="btn btn-ghost btn-icon"
										type="button"
										onclick={() => move(i, 1)}
										disabled={disabled || i === fields.length - 1}
										aria-label="Move down"><Icon name="arrow-down" size={14} /></button
									>
									<button
										class="btn btn-ghost btn-icon"
										type="button"
										onclick={() => duplicate(i)}
										{disabled}
										aria-label="Duplicate"><Icon name="copy" size={14} /></button
									>
									<button
										class="btn btn-ghost btn-icon text-stone-400 hover:text-red-700"
										type="button"
										onclick={() => remove(i)}
										{disabled}
										aria-label="Remove"><Icon name="trash" size={14} /></button
									>
									<button
										class="btn btn-ghost btn-icon"
										type="button"
										onclick={() => (expanded = open ? null : field.id)}
										aria-label={open ? 'Collapse' : 'Expand'}
									>
										<Icon
											name="chevron-down"
											size={14}
											class="transition {open ? 'rotate-180' : ''}"
										/>
									</button>
								</div>
							</div>

							{#if open}
								<div
									class="grid gap-3 border-t border-stone-100 bg-stone-50/50 p-4 sm:grid-cols-[1fr_190px]"
								>
									<div>
										<label class="label" for="label-{field.id}"
											>{section ? 'Section title' : 'Question'}</label
										>
										<input
											class="input"
											id="label-{field.id}"
											bind:value={field.label}
											placeholder={section ? 'About you' : 'What should we call you?'}
											maxlength="200"
											{disabled}
										/>
									</div>
									<div>
										<label class="label" for="type-{field.id}">Type</label>
										<select class="input" id="type-{field.id}" bind:value={field.type} {disabled}>
											{#each FIELD_TYPES as t (t)}
												<option value={t}>{FIELD_TYPE_LABELS[t]}</option>
											{/each}
										</select>
									</div>
									{#if section}
										<div class="sm:col-span-2">
											<label class="label" for="help-{field.id}"
												>Description <span class="font-normal text-stone-400">(optional)</span
												></label
											>
											<textarea
												class="input"
												id="help-{field.id}"
												rows="2"
												bind:value={field.helpText}
												placeholder="A sentence or two introducing this part of the form"
												maxlength="400"
												{disabled}></textarea>
										</div>
										<p class="flex items-start gap-1.5 text-xs text-stone-500 sm:col-span-2">
											<Icon name="info" size={13} class="mt-0.5 shrink-0" />
											Sections group the questions that follow them. Switch the layout to "One section
											per step" in Design to turn each section into its own page.
										</p>
									{:else}
										{#if hasOptions(field.type)}
											<div class="sm:col-span-2">
												<label class="label" for="options-{field.id}"
													>Options <span class="font-normal text-stone-400">(one per line)</span
													></label
												>
												<textarea
													class="input font-mono text-xs"
													id="options-{field.id}"
													rows="4"
													bind:value={field.optionsText}
													{disabled}></textarea>
											</div>
										{:else if field.type !== 'file'}
											<div class="sm:col-span-2">
												<label class="label" for="placeholder-{field.id}">Placeholder</label>
												<input
													class="input"
													id="placeholder-{field.id}"
													bind:value={field.placeholder}
													maxlength="200"
													{disabled}
												/>
											</div>
										{/if}
										<div class="sm:col-span-2">
											<label class="label" for="help-{field.id}">Help text</label>
											<input
												class="input"
												id="help-{field.id}"
												bind:value={field.helpText}
												placeholder="Optional hint shown under the question"
												maxlength="400"
												{disabled}
											/>
										</div>
										<label class="flex items-center gap-2 text-sm text-stone-700 sm:col-span-2">
											<input
												type="checkbox"
												class="rounded border-stone-300 text-brand-600 focus:ring-brand-500"
												bind:checked={field.required}
												{disabled}
											/>
											Required
										</label>
									{/if}
								</div>
							{/if}
						</li>
					{/each}
				</ol>

				{#if fields.length === 0}
					<p class="card border-dashed p-8 text-center text-sm text-stone-500">
						No questions yet. Pick a type below to add one.
					</p>
				{/if}

				{#if !disabled}
					<div class="card mt-3 p-3">
						<p class="mb-2 px-1 text-xs font-medium tracking-wide text-stone-500 uppercase">
							Add a question
						</p>
						<div class="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
							{#each QUESTION_TYPES as t (t)}
								<button
									class="flex flex-col items-center gap-1.5 rounded-lg border border-stone-200 px-2 py-2.5 text-xs text-stone-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
									type="button"
									onclick={() => add(t)}
								>
									<Icon name={FIELD_ICONS[t]} size={16} />
									{FIELD_TYPE_LABELS[t]}
								</button>
							{/each}
						</div>
						<button
							class="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-brand-300 bg-brand-50/50 px-3 py-2.5 text-xs font-medium text-brand-800 transition hover:bg-brand-50"
							type="button"
							onclick={() => add('section')}
						>
							<Icon name="heading" size={14} /> Add a section break
						</button>
					</div>
				{/if}
			</section>
		{:else}
			<section class="card animate-rise divide-y divide-stone-100">
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
										><span class="block h-1 rounded-t-md" style="background:{theme.accent}"
										></span></span
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
							Add a section break to split the form into steps.
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
			</section>
		{/if}

		<section class="card p-5">
			<label class="label" for="successMessage">Message after submitting</label>
			<input
				class="input"
				id="successMessage"
				name="successMessage"
				maxlength="500"
				bind:value={successMessage}
				{disabled}
			/>
		</section>

		{#if error}
			<p class="alert-error" role="alert">
				<Icon name="alert-circle" size={16} class="mt-0.5" />{error}
			</p>
		{/if}

		{#if !disabled}
			<div
				class="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white/95 p-3 shadow-pop backdrop-blur"
			>
				<p class="flex items-center gap-1.5 text-xs text-stone-500">
					{#if dirty}
						<span class="size-1.5 rounded-full bg-amber-500"></span> Unsaved changes
					{:else if saved}
						<Icon name="check" size={12} class="text-emerald-600" /> All changes saved
					{:else}
						<Icon name="check" size={12} class="text-stone-400" /> Up to date
					{/if}
				</p>
				<button class="btn btn-primary" type="submit" disabled={saving || !dirty}>
					{saving ? 'Saving...' : 'Save changes'}
					<kbd
						class="ml-1 hidden rounded border border-white/30 px-1 text-[10px] font-normal opacity-80 sm:inline"
						>Ctrl S</kbd
					>
				</button>
			</div>
		{/if}
	</form>

	<aside class="xl:sticky xl:top-8 xl:self-start">
		<div class="mb-2 flex items-center justify-between px-1">
			<h2 class="flex items-center gap-1.5 text-sm font-semibold">
				<Icon name="eye" size={14} /> Live preview
			</h2>
			<span class="text-xs text-stone-500">
				{#if stepped}{steps.length} steps{:else}Updates as you type{/if}
			</span>
		</div>
		<div
			class="fw-theme overflow-hidden rounded-2xl border border-stone-200 p-4 sm:p-8 {fontClass[
				theme.font
			]}"
			style="{themeVars(theme)};{backgroundStyle(theme)}"
		>
			<div
				class="mx-auto max-w-lg overflow-hidden border border-black/5 bg-white shadow-pop {cardRadiusClass[
					theme.radius
				]}"
				inert
			>
				<div class="bg-accent h-1.5"></div>
				<div class="p-6">
					{#if stepped}
						<div class="mb-4 flex items-center justify-between text-xs text-stone-500">
							<span>Step 1 of {steps.length}</span>
							<span class="h-1.5 w-24 overflow-hidden rounded-full bg-stone-200"
								><span class="bg-accent block h-full" style="width:{100 / steps.length}%"
								></span></span
							>
						</div>
					{/if}
					<h3 class="text-xl font-semibold tracking-tight {title ? '' : 'text-stone-400'}">
						{title || 'Untitled form'}
					</h3>
					{#if description}
						<p class="mt-1.5 text-sm whitespace-pre-line text-stone-600">{description}</p>
					{/if}
					<div class="mt-5 space-y-4">
						{#each previewFields as field (field.id)}
							<FieldInput {field} />
						{/each}
						{#if previewFields.length === 0}
							<p class="text-sm text-stone-400">Your questions will appear here.</p>
						{/if}
					</div>
					<div class="btn btn-accent mt-6 {buttonRadiusClass[theme.radius]}">
						{stepped ? 'Next' : theme.submitLabel || 'Submit'}
					</div>
				</div>
			</div>
			{#if theme.showBranding}
				<p
					class="mt-4 text-center text-xs {isDarkBackground(theme)
						? 'text-white/60'
						: 'text-stone-400'}"
				>
					Powered by Formwrite
				</p>
			{/if}
		</div>
	</aside>
</div>
