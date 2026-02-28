<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages.js';
</script>

<div class="space-y-2">
	<h1 class="text-2xl font-semibold">{m.nav_budget()}</h1>
	<p class="text-sm text-muted-foreground">{page.params.year}-{page.params.month}</p>
</div>
