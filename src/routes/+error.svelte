<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import Logo from '$lib/components/Logo.svelte';
</script>

<svelte:head><title>{page.status} - Formwrite</title></svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center px-6 text-center">
	<Logo />
	<div class="card mt-8 w-full max-w-sm p-8">
		<div class="mx-auto grid size-12 place-items-center rounded-2xl bg-stone-100 text-stone-500">
			<Icon name="alert-circle" size={22} />
		</div>
		<p class="mt-4 text-xs font-medium tracking-wide text-stone-500">Error {page.status}</p>
		<h1 class="mt-1 text-lg font-semibold">{page.error?.message ?? 'Something went wrong'}</h1>
		<p class="mt-2 text-sm text-stone-500">
			{page.status === 404
				? 'The page may have moved, or you may not have access to this workspace.'
				: 'Please try again in a moment.'}
		</p>
		<a href="/app" class="btn btn-primary mt-6 w-full">
			<Icon name="arrow-left" size={14} /> Back to Formwrite
		</a>
	</div>
</div>
