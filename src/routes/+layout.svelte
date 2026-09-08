<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import ProgressBar from '$lib/components/ProgressBar.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Formwrite</title>
</svelte:head>

<ProgressBar />
{@render children()}
