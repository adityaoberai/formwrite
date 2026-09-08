<script lang="ts">
	let {
		href = '/',
		compact = false,
		light = false,
		size = 'md'
	}: { href?: string; compact?: boolean; light?: boolean; size?: 'md' | 'lg' } = $props();
</script>

<a
	{href}
	class="inline-flex items-center gap-2.5 font-semibold tracking-tight {light
		? 'text-white'
		: 'text-ink'} {size === 'lg' ? 'text-xl' : 'text-[15px]'}"
	aria-label="Formwrite home"
>
	<svg viewBox="0 0 64 64" class={size === 'lg' ? 'size-9' : 'size-7'} aria-hidden="true">
		<rect width="64" height="64" rx="16" fill="#4f46e5" />
		<path d="M20 16h26v8H29v8h14v8H29v8h-9z" fill="#fff" />
	</svg>
	{#if !compact}<span>Formwrite</span>{/if}
</a>
