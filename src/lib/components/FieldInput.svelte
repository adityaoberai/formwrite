<script lang="ts">
	import type { FormField } from '$lib/types';

	let {
		field,
		value = '',
		error = ''
	}: { field: FormField; value?: string | string[]; error?: string } = $props();

	const single = $derived(Array.isArray(value) ? '' : value);
	const multi = $derived(Array.isArray(value) ? value : []);
	const describedBy = $derived(
		[error ? `${field.id}-error` : '', field.helpText ? `${field.id}-help` : '']
			.filter(Boolean)
			.join(' ') || undefined
	);
</script>

{#if field.type === 'section'}
	<div class="border-t border-stone-200/80 pt-5 first:border-t-0 first:pt-0">
		<h2 class="text-lg font-semibold tracking-tight">{field.label}</h2>
		{#if field.helpText}
			<p class="mt-1 text-sm whitespace-pre-line text-stone-600">{field.helpText}</p>
		{/if}
	</div>
{:else}
	<div>
		{#if field.type === 'radio' || field.type === 'checkbox'}
			<fieldset aria-describedby={describedBy}>
				<legend class="label">
					{field.label}{#if field.required}<span class="text-red-600"> *</span>{/if}
				</legend>
				<div class="mt-1 space-y-2">
					{#each field.options ?? [] as option, i (option)}
						<label class="flex items-center gap-2 text-sm text-stone-800">
							<input
								type={field.type}
								name={field.id}
								value={option}
								class="border-stone-300 text-brand-600 focus:ring-brand-500 {field.type ===
								'checkbox'
									? 'rounded'
									: ''}"
								checked={field.type === 'radio' ? single === option : multi.includes(option)}
								required={field.type === 'radio' && field.required && i === 0 ? true : undefined}
							/>
							{option}
						</label>
					{/each}
				</div>
			</fieldset>
		{:else}
			<label class="label" for={field.id}>
				{field.label}{#if field.required}<span class="text-red-600"> *</span>{/if}
			</label>
			{#if field.type === 'textarea'}
				<textarea
					class="input"
					id={field.id}
					name={field.id}
					rows="4"
					placeholder={field.placeholder}
					required={field.required}
					aria-describedby={describedBy}
					aria-invalid={error ? 'true' : undefined}>{single}</textarea
				>
			{:else if field.type === 'select'}
				<select
					class="input"
					id={field.id}
					name={field.id}
					required={field.required}
					value={single}
					aria-describedby={describedBy}
					aria-invalid={error ? 'true' : undefined}
				>
					<option value="">Choose...</option>
					{#each field.options ?? [] as option (option)}
						<option value={option}>{option}</option>
					{/each}
				</select>
			{:else if field.type === 'file'}
				<input
					class="block w-full text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-stone-800"
					id={field.id}
					name={field.id}
					type="file"
					required={field.required}
					aria-describedby={describedBy}
					aria-invalid={error ? 'true' : undefined}
				/>
			{:else}
				<input
					class="input"
					id={field.id}
					name={field.id}
					type={field.type === 'text' ? 'text' : field.type}
					step={field.type === 'number' ? 'any' : undefined}
					placeholder={field.placeholder}
					required={field.required}
					value={single}
					aria-describedby={describedBy}
					aria-invalid={error ? 'true' : undefined}
				/>
			{/if}
		{/if}
		{#if field.helpText}
			<p class="help" id="{field.id}-help">{field.helpText}</p>
		{/if}
		{#if error}
			<p class="mt-1 text-xs text-red-700" id="{field.id}-error" role="alert">{error}</p>
		{/if}
	</div>
{/if}
