<script lang="ts">
	import FormPreview from './FormPreview.svelte';
	import Icon from './Icon.svelte';
	import { FIELD_ICONS, fieldMeta, fieldSummary, newField, newFieldId } from '$lib/fields';
	import {
		FIELD_GROUPS,
		FIELD_TYPE_META,
		FIELD_TYPES_WITH_OPTIONS,
		FIELD_TYPES_WITH_PLACEHOLDER,
		RATING_SCALES,
		isLayoutType,
		isQuestion,
		type FieldType,
		type FormField,
		type FormTheme
	} from '$lib/types';

	/**
	 * Three-pane form builder: a palette of field types, a canvas of draggable cards and an
	 * inspector for the selected field. Owns nothing but the selection; `fields` is bound so the
	 * page can serialise and save it.
	 */
	let {
		fields = $bindable(),
		theme,
		title = '',
		description = '',
		logoUrl = '',
		disabled = false
	}: {
		fields: FormField[];
		theme: FormTheme;
		title?: string;
		description?: string;
		logoUrl?: string;
		disabled?: boolean;
	} = $props();

	let selectedId = $state<string | null>(null);
	let mode = $state<'build' | 'preview'>('build');
	let dragIndex = $state<number | null>(null);
	let paletteOpen = $state(false);

	const selected = $derived(fields.find((f) => f.id === selectedId) ?? null);
	const selectedIndex = $derived(fields.findIndex((f) => f.id === selectedId));
	const questionCount = $derived(fields.filter(isQuestion).length);
	const requiredCount = $derived(fields.filter((f) => f.required).length);

	const TEXTLIKE: readonly FieldType[] = ['text', 'email', 'phone', 'url', 'number', 'date'];

	function add(type: FieldType) {
		if (disabled) return;
		const field = newField(type);
		const at = selectedIndex >= 0 ? selectedIndex + 1 : fields.length;
		fields.splice(at, 0, field);
		selectedId = field.id;
		paletteOpen = false;
		queueMicrotask(() =>
			document
				.getElementById(`card-${field.id}`)
				?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
		);
	}

	function remove(index: number) {
		if (disabled || index < 0) return;
		const [removed] = fields.splice(index, 1);
		if (removed?.id === selectedId)
			selectedId = fields[Math.min(index, fields.length - 1)]?.id ?? null;
	}

	function duplicate(index: number) {
		if (disabled) return;
		const copy: FormField = {
			...structuredClone($state.snapshot(fields[index])),
			id: newFieldId()
		};
		if (copy.options) copy.options = [...copy.options];
		fields.splice(index + 1, 0, copy);
		selectedId = copy.id;
	}

	function move(from: number, to: number) {
		if (disabled || to < 0 || to >= fields.length || from === to) return;
		const [item] = fields.splice(from, 1);
		fields.splice(to, 0, item);
	}

	function onDragStart(e: DragEvent, index: number) {
		if (disabled) return;
		dragIndex = index;
		e.dataTransfer?.setData('text/plain', String(index));
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}
	function onDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (dragIndex === null || dragIndex === index) return;
		move(dragIndex, index);
		dragIndex = index;
	}

	function addOption() {
		if (!selected) return;
		selected.options = [
			...(selected.options ?? []),
			`Option ${(selected.options?.length ?? 0) + 1}`
		];
	}
	function removeOption(i: number) {
		if (!selected?.options || selected.options.length <= 1) return;
		selected.options.splice(i, 1);
	}
</script>

<div class="flex h-full min-h-0 flex-col">
	<!-- Toolbar -->
	<div class="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-2">
		<div class="flex items-center gap-1 rounded-lg bg-stone-100 p-0.5 text-sm" role="tablist">
			<button
				type="button"
				role="tab"
				aria-selected={mode === 'build'}
				class="rounded-md px-3 py-1 font-medium {mode === 'build'
					? 'bg-white text-ink shadow-card'
					: 'text-stone-500 hover:text-ink'}"
				onclick={() => (mode = 'build')}>Build</button
			>
			<button
				type="button"
				role="tab"
				aria-selected={mode === 'preview'}
				class="rounded-md px-3 py-1 font-medium {mode === 'preview'
					? 'bg-white text-ink shadow-card'
					: 'text-stone-500 hover:text-ink'}"
				onclick={() => (mode = 'preview')}>Preview</button
			>
		</div>
		<div class="text-xs text-stone-500">
			{questionCount} question{questionCount === 1 ? '' : 's'} &middot; {requiredCount} required
		</div>
		{#if !disabled && mode === 'build'}
			<button
				type="button"
				class="btn btn-primary btn-sm lg:hidden"
				onclick={() => (paletteOpen = !paletteOpen)}
			>
				<Icon name="plus" size={14} /> Add field
			</button>
		{/if}
	</div>

	{#if mode === 'preview'}
		<div class="min-h-0 flex-1 overflow-auto bg-stone-100/60 p-4 md:p-8">
			<FormPreview {title} {description} {fields} {theme} {logoUrl} />
		</div>
	{:else}
		<div class="grid min-h-0 flex-1 lg:grid-cols-[236px_minmax(0,1fr)_320px]">
			<!-- Palette -->
			<aside
				class="{paletteOpen
					? 'block'
					: 'hidden'} overflow-auto border-r border-stone-200 bg-white p-3 lg:block"
				aria-label="Field types"
			>
				{#each FIELD_GROUPS as group (group)}
					<p
						class="px-1.5 pt-2 pb-1.5 text-[11px] font-semibold tracking-wide text-stone-400 uppercase"
					>
						{group}
					</p>
					<div class="mb-1 grid gap-0.5">
						{#each FIELD_TYPE_META.filter((m) => m.group === group) as meta (meta.type)}
							<button
								type="button"
								class="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm text-stone-700 transition hover:bg-brand-50 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
								onclick={() => add(meta.type)}
								title={meta.description}
								{disabled}
							>
								<span
									class="grid size-6 shrink-0 place-items-center rounded-md bg-stone-100 text-stone-600"
									><Icon name={FIELD_ICONS[meta.type]} size={14} /></span
								>
								{meta.label}
							</button>
						{/each}
					</div>
				{/each}
			</aside>

			<!-- Canvas -->
			<section class="min-h-0 overflow-auto bg-stone-100/60 p-4 md:p-6" aria-label="Form canvas">
				<div class="mx-auto max-w-2xl space-y-2">
					{#if fields.length === 0}
						<div class="rounded-2xl border-2 border-dashed border-stone-300 p-10 text-center">
							<p class="font-medium text-ink">Your form is empty</p>
							<p class="mt-1 text-sm text-stone-500">
								Pick a field type from the left to get started.
							</p>
						</div>
					{/if}
					{#each fields as field, i (field.id)}
						{@const active = field.id === selectedId}
						<div
							id="card-{field.id}"
							role="button"
							tabindex="0"
							draggable={!disabled}
							class="group relative cursor-pointer rounded-xl border bg-white p-4 pl-9 shadow-card transition-[border-color,box-shadow] {active
								? 'border-brand-500 ring-2 ring-brand-500/20'
								: 'border-stone-200 hover:border-stone-300'} {dragIndex === i ? 'opacity-60' : ''}"
							onclick={() => (selectedId = field.id)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									selectedId = field.id;
								}
							}}
							ondragstart={(e) => onDragStart(e, i)}
							ondragover={(e) => onDragOver(e, i)}
							ondragend={() => (dragIndex = null)}
							ondrop={(e) => e.preventDefault()}
						>
							<span
								class="absolute top-0 bottom-0 left-2 flex items-center text-stone-400 opacity-40 group-hover:opacity-100"
								aria-hidden="true"
							>
								<Icon name="grip" size={16} strokeWidth={3} />
							</span>

							<div class="flex items-start gap-3">
								<span
									class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700"
									><Icon name={FIELD_ICONS[field.type]} size={14} /></span
								>
								<div class="min-w-0 flex-1">
									{#if field.type === 'section'}
										<p class="truncate text-base font-bold">{field.label || 'Section title'}</p>
										{#if field.helpText}
											<p class="mt-0.5 line-clamp-2 text-sm text-stone-500">{field.helpText}</p>
										{/if}
									{:else if field.type === 'paragraph'}
										<p class="line-clamp-2 text-sm text-stone-500">{field.label || 'Paragraph'}</p>
									{:else}
										<p class="truncate text-sm font-medium">
											{field.label || 'Untitled question'}{#if field.required}<span
													class="text-red-500"
												>
													*</span
												>{/if}
										</p>
										<p class="mt-0.5 text-xs text-stone-500">{fieldSummary(field)}</p>
										{#if TEXTLIKE.includes(field.type)}
											<div
												class="mt-2 h-8 w-2/3 rounded-md border border-stone-200 bg-stone-50"
											></div>
										{:else if field.type === 'textarea'}
											<div class="mt-2 h-14 rounded-md border border-stone-200 bg-stone-50"></div>
										{:else if field.type === 'select'}
											<div
												class="mt-2 flex h-8 w-2/3 items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-2 text-xs text-stone-400"
											>
												{field.placeholder || 'Choose...'}
												<Icon name="chevron-down" size={12} />
											</div>
										{:else if FIELD_TYPES_WITH_OPTIONS.includes(field.type)}
											<div class="mt-2 flex flex-wrap gap-1.5">
												{#each (field.options ?? []).slice(0, 4) as opt, oi (oi)}
													<span
														class="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-600"
														>{opt}</span
													>
												{/each}
												{#if (field.options?.length ?? 0) > 4}<span class="text-xs text-stone-400"
														>+{(field.options?.length ?? 0) - 4}</span
													>{/if}
											</div>
										{:else if field.type === 'yes_no'}
											<div class="mt-2 flex gap-1.5">
												<span
													class="rounded-md border border-stone-200 bg-stone-50 px-3 py-0.5 text-xs text-stone-600"
													>Yes</span
												>
												<span
													class="rounded-md border border-stone-200 bg-stone-50 px-3 py-0.5 text-xs text-stone-600"
													>No</span
												>
											</div>
										{:else if field.type === 'rating'}
											<div class="mt-2 flex gap-0.5 text-amber-400">
												{#each Array.from({ length: Math.min(field.max ?? 5, 10) }, (_, si) => si) as si (si)}<Icon
														name="star"
														size={16}
													/>{/each}
											</div>
										{:else if field.type === 'file'}
											<div
												class="mt-2 flex h-10 w-2/3 items-center gap-2 rounded-md border border-dashed border-stone-300 bg-stone-50 px-3 text-xs text-stone-400"
											>
												<Icon name="upload" size={14} /> Choose a file
											</div>
										{/if}
									{/if}
								</div>

								{#if !disabled}
									<div
										class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 {active
											? 'opacity-100'
											: ''}"
									>
										<button
											type="button"
											class="btn btn-ghost btn-icon"
											title="Move up"
											aria-label="Move up"
											disabled={i === 0}
											onclick={(e) => {
												e.stopPropagation();
												move(i, i - 1);
											}}><Icon name="arrow-up" size={14} /></button
										>
										<button
											type="button"
											class="btn btn-ghost btn-icon"
											title="Move down"
											aria-label="Move down"
											disabled={i === fields.length - 1}
											onclick={(e) => {
												e.stopPropagation();
												move(i, i + 1);
											}}><Icon name="arrow-down" size={14} /></button
										>
										<button
											type="button"
											class="btn btn-ghost btn-icon"
											title="Duplicate"
											aria-label="Duplicate"
											onclick={(e) => {
												e.stopPropagation();
												duplicate(i);
											}}><Icon name="duplicate" size={14} /></button
										>
										<button
											type="button"
											class="btn btn-ghost btn-icon hover:text-red-700"
											title="Delete"
											aria-label="Delete"
											onclick={(e) => {
												e.stopPropagation();
												remove(i);
											}}><Icon name="trash" size={14} /></button
										>
									</div>
								{/if}
							</div>
						</div>
					{/each}

					{#if fields.length > 0}
						<div class="pt-2 text-center">
							{#if !disabled}
								<button
									type="button"
									class="btn btn-secondary btn-sm lg:hidden"
									onclick={() => (paletteOpen = true)}
									><Icon name="plus" size={14} /> Add field</button
								>
							{/if}
							<p class="hidden text-xs text-stone-400 lg:block">
								Drag cards to reorder &middot; click a card to edit it
							</p>
						</div>
					{/if}
				</div>
			</section>

			<!-- Inspector -->
			<aside
				class="min-h-0 overflow-auto border-t border-stone-200 bg-white p-4 lg:border-t-0 lg:border-l"
				aria-label="Field settings"
			>
				{#if selected}
					{@const meta = fieldMeta(selected.type)}
					<div class="mb-4 flex items-center gap-2">
						<span class="grid size-7 place-items-center rounded-md bg-brand-50 text-brand-700"
							><Icon name={FIELD_ICONS[selected.type]} size={15} /></span
						>
						<div>
							<p class="text-sm font-semibold">{meta.label}</p>
							<p class="text-xs text-stone-500">{meta.description}</p>
						</div>
					</div>

					<div class="space-y-4">
						<div>
							<label class="label" for="insp-label"
								>{selected.type === 'paragraph'
									? 'Text'
									: selected.type === 'section'
										? 'Section title'
										: 'Question'}</label
							>
							{#if selected.type === 'paragraph'}
								<textarea
									class="input"
									id="insp-label"
									rows="4"
									maxlength="1000"
									bind:value={selected.label}
									{disabled}></textarea>
							{:else}
								<input
									class="input"
									id="insp-label"
									type="text"
									maxlength="200"
									bind:value={selected.label}
									{disabled}
								/>
							{/if}
						</div>

						{#if selected.type !== 'paragraph'}
							<div>
								<label class="label" for="insp-desc"
									>Description <span class="font-normal text-stone-400">(optional)</span></label
								>
								<input
									class="input"
									id="insp-desc"
									type="text"
									maxlength="400"
									bind:value={selected.helpText}
									placeholder={selected.type === 'section'
										? 'A sentence introducing this part of the form'
										: 'Help text shown under the question'}
									{disabled}
								/>
							</div>
						{/if}

						{#if selected.type === 'section'}
							<p class="flex items-start gap-1.5 text-xs text-stone-500">
								<Icon name="info" size={13} class="mt-0.5 shrink-0" />
								Sections group the questions that follow them. Choose "One section per step" under Settings
								to turn each section into its own page.
							</p>
						{/if}

						{#if FIELD_TYPES_WITH_PLACEHOLDER.includes(selected.type)}
							<div>
								<label class="label" for="insp-ph">Placeholder</label>
								<input
									class="input"
									id="insp-ph"
									type="text"
									maxlength="200"
									bind:value={selected.placeholder}
									{disabled}
								/>
							</div>
						{/if}

						{#if FIELD_TYPES_WITH_OPTIONS.includes(selected.type)}
							<div>
								<span class="label">Options</span>
								<div class="space-y-1.5">
									{#each selected.options ?? [] as opt, oi (oi)}
										<div class="flex items-center gap-1.5">
											<input
												class="input"
												type="text"
												maxlength="200"
												value={opt}
												oninput={(e) => {
													if (selected.options) selected.options[oi] = e.currentTarget.value;
												}}
												aria-label="Option {oi + 1}"
												{disabled}
											/>
											<button
												type="button"
												class="btn btn-ghost btn-icon hover:text-red-700"
												aria-label="Remove option"
												onclick={() => removeOption(oi)}
												disabled={disabled || (selected.options?.length ?? 0) <= 1}
												><Icon name="x" size={14} /></button
											>
										</div>
									{/each}
								</div>
								<button
									type="button"
									class="btn btn-secondary btn-sm mt-2"
									onclick={addOption}
									{disabled}><Icon name="plus" size={13} /> Add option</button
								>
							</div>
						{/if}

						{#if selected.type === 'rating'}
							<div>
								<label class="label" for="insp-scale">Scale</label>
								<select
									class="input"
									id="insp-scale"
									value={String(selected.max ?? 5)}
									onchange={(e) => (selected.max = Number(e.currentTarget.value))}
									{disabled}
								>
									{#each RATING_SCALES as n (n)}
										<option value={String(n)}>1 to {n}</option>
									{/each}
								</select>
							</div>
						{/if}

						{#if !isLayoutType(selected.type)}
							<label
								class="flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-3 py-2.5"
							>
								<span class="text-sm font-medium">Required</span>
								<input
									type="checkbox"
									class="size-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
									bind:checked={selected.required}
									{disabled}
								/>
							</label>
						{/if}

						{#if !disabled}
							<div class="border-t border-stone-100 pt-3">
								<button
									type="button"
									class="btn btn-ghost btn-sm text-red-700 hover:bg-red-50"
									onclick={() => remove(selectedIndex)}
									><Icon name="trash" size={14} /> Delete field</button
								>
							</div>
						{/if}
					</div>
				{:else}
					<div class="flex h-full flex-col items-center justify-center py-10 text-center">
						<Icon name="mouse" size={28} class="text-stone-400" />
						<p class="mt-3 text-sm font-medium text-ink">Nothing selected</p>
						<p class="mt-1 text-xs text-stone-500">
							Click a field on the canvas to edit its settings.
						</p>
					</div>
				{/if}
			</aside>
		</div>
	{/if}
</div>
