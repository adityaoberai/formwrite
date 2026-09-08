<script lang="ts">
	let {
		name,
		size = 'md',
		square = false
	}: { name: string; size?: 'sm' | 'md' | 'lg'; square?: boolean } = $props();

	const PALETTE = [
		'bg-brand-100 text-brand-800',
		'bg-emerald-100 text-emerald-800',
		'bg-amber-100 text-amber-800',
		'bg-rose-100 text-rose-800',
		'bg-sky-100 text-sky-800',
		'bg-violet-100 text-violet-800',
		'bg-teal-100 text-teal-800'
	];

	const initials = $derived(
		(name || '?')
			.trim()
			.split(/[\s@._-]+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((p) => p[0]?.toUpperCase() ?? '')
			.join('') || '?'
	);
	const color = $derived(
		PALETTE[
			[...(name || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % PALETTE.length
		]
	);
	const sizes = { sm: 'size-6 text-[10px]', md: 'size-8 text-xs', lg: 'size-11 text-sm' };
</script>

<span
	class="inline-flex shrink-0 items-center justify-center font-semibold select-none {sizes[
		size
	]} {color} {square ? 'rounded-lg' : 'rounded-full'}"
	aria-hidden="true"
>
	{initials}
</span>
