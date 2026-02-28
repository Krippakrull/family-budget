<script lang="ts">
	import Sidebar from '$lib/components/sidebar.svelte';
	import { Toaster } from '$lib/components/ui/sonner';

	let { children, data } = $props();
</script>

<div class="flex h-screen">
	<Sidebar user={data.user} family={data.family} />
	<main class="flex-1 overflow-y-auto p-6">
		{@render children()}
	</main>
</div>
<Toaster />
