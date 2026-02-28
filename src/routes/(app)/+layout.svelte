<script lang="ts">
	import MobileNav from '$lib/components/mobile-nav.svelte';
	import Sidebar from '$lib/components/sidebar.svelte';
	import { Toaster } from '$lib/components/ui/sonner';

	let { children, data } = $props();
</script>

<div class="flex h-dvh overflow-hidden">
	<div class="hidden md:flex">
		<Sidebar user={data.user} family={data.family} />
	</div>
	<main class="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">
		{@render children()}
	</main>
</div>
<MobileNav user={data.user} family={data.family} />
<Toaster />
