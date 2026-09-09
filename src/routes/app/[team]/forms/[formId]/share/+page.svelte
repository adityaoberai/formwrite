<script lang="ts">
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const embedUrl = $derived(`${data.publicUrl}?embed=1`);
	const embedCode = $derived(
		`<iframe src="${embedUrl}" width="100%" height="700" style="border:0;border-radius:12px" title="${data.form.title.replace(/"/g, '&quot;')}" loading="lazy"></iframe>`
	);
	const live = $derived(data.form.status === 'published');
</script>

<svelte:head><title>Share - {data.form.title} - Formwrite</title></svelte:head>

<div class="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
	{#if !live}
		<div
			class="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
		>
			<Icon name="alert-circle" size={18} class="mt-0.5 shrink-0" />
			<div>
				<p class="font-medium">This form is a draft.</p>
				<p class="mt-0.5">
					The link below will not work until you publish the form with the Publish button at the
					top.
				</p>
			</div>
		</div>
	{/if}

	<div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
		<div class="min-w-0 space-y-4">
			<section class="card p-5">
				<h2 class="flex items-center gap-2 font-semibold">
					<Icon name="link" size={16} class="text-brand-600" /> Public link
				</h2>
				<p class="mt-1 text-sm text-stone-500">
					Anyone with this link can respond. Every response is stored in your workspace.
				</p>
				<div class="mt-3 flex items-center gap-2">
					<input
						class="input font-mono text-xs"
						type="text"
						readonly
						value={data.publicUrl}
						onfocus={(e) => e.currentTarget.select()}
						aria-label="Public link"
					/>
					<CopyButton text={data.publicUrl} class="btn btn-primary shrink-0" />
					<a
						href={data.publicUrl}
						target="_blank"
						rel="noopener"
						class="btn btn-secondary btn-icon shrink-0"
						aria-label="Open form"
						title="Open form"><Icon name="external-link" size={16} /></a
					>
				</div>
			</section>

			<section class="card p-5">
				<h2 class="flex items-center gap-2 font-semibold">
					<Icon name="code" size={16} class="text-brand-600" /> Embed on your website
				</h2>
				<p class="mt-1 text-sm text-stone-500">
					Paste this snippet into any HTML page. The embedded form hides the header and footer.
				</p>
				<pre
					class="mt-3 overflow-x-auto rounded-lg bg-ink p-4 font-mono text-xs leading-relaxed text-emerald-100"><code
						>{embedCode}</code
					></pre>
				<div class="mt-3 flex gap-2">
					<CopyButton text={embedCode} label="Copy snippet" />
					<a href={embedUrl} target="_blank" rel="noopener" class="btn btn-secondary btn-sm"
						><Icon name="eye" size={14} /> Preview embed</a
					>
				</div>
			</section>
		</div>

		<section class="card flex flex-col items-center p-5 text-center">
			<h2 class="flex items-center gap-2 font-semibold">
				<Icon name="qr" size={16} class="text-brand-600" /> QR code
			</h2>
			<p class="mt-1 text-sm text-stone-500">
				Points at the public link. Print it or drop it in a slide.
			</p>
			<img
				src={data.qrUrl}
				alt="QR code linking to {data.form.title}"
				width="200"
				height="200"
				class="mt-4 rounded-xl border border-stone-200 bg-white p-2"
			/>
			<a href="{data.qrUrl}?download=1" class="btn btn-secondary btn-sm mt-4" download
				><Icon name="download" size={14} /> Download PNG</a
			>
		</section>
	</div>
</div>
