<script lang="ts">
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import favicon from '$lib/assets/favicon.svg';
	import { i18n } from '$lib/i18n';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<ParaglideJS {i18n}>{@render children()}</ParaglideJS>
