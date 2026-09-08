<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import { page } from '$app/state';

	let { children } = $props();

	const description = 'Forms for teams that keep their data to themselves.';
	const ogImage = $derived(`${page.url.origin}/og.png`);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Formwrite</title>
	<meta property="og:site_name" content="Formwrite" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Formwrite" />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta
		property="og:image:alt"
		content="Formwrite: forms for teams that keep their data to themselves"
	/>
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Formwrite" />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />
</svelte:head>

<ProgressBar />
{@render children()}
