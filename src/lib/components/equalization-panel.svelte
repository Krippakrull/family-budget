<script lang="ts">
	import { calculateEqualRemainder, calculateProportional, type MemberBalance } from '$lib/equalization';
	import * as m from '$lib/paraglide/messages.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

	let { members, mode = 'equal' } = $props<{
		members: MemberBalance[];
		mode?: 'equal' | 'proportional';
	}>();

	const transfers = $derived(
		mode === 'equal' ? calculateEqualRemainder(members) : calculateProportional(members)
	);

	function formatAmount(oren: number): string {
		return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(oren / 100);
	}
</script>

<Card>
	<CardHeader>
		<CardTitle>{m.equalization()}</CardTitle>
	</CardHeader>
	<CardContent>
		{#if transfers.length === 0}
			<p class="text-sm text-muted-foreground">No transfers needed.</p>
		{:else}
			<ul class="space-y-2">
				{#each transfers as transfer}
					<li class="rounded-md border p-3 text-sm">
						<span class="font-medium">{transfer.fromName}</span>
						<span class="text-muted-foreground"> -> </span>
						<span class="font-medium">{transfer.toName}</span>
						<span class="ml-2 font-semibold text-primary">{formatAmount(transfer.amount)}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</CardContent>
</Card>
