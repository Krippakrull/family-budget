<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';

	type StatsRow = { tagTotals: Record<string, number> };
	let { data: monthlyData } = $props<{ data: StatsRow[] }>();

	const aggregatedTagTotals = $derived.by(() => {
		const totals: Record<string, number> = {};
		for (const row of monthlyData) {
			for (const [tag, amount] of Object.entries(row.tagTotals) as Array<[string, number]>) {
				totals[tag] = (totals[tag] ?? 0) + amount;
			}
		}
		return totals;
	});

	const rows = $derived.by(() =>
		(Object.entries(aggregatedTagTotals) as Array<[string, number]>).sort((a, b) => b[1] - a[1])
	);

	const maxValue = $derived.by(() => {
		let max = 1;
		for (const [, amount] of rows) {
			max = Math.max(max, amount);
		}
		return max;
	});

	function toPercent(value: number): number {
		return Math.max(0, Math.min(100, Math.round((value / maxValue) * 100)));
	}
</script>

<div class="space-y-3">
	{#each rows as [tag, amount]}
		<div class="space-y-1">
			<div class="flex items-center justify-between text-xs text-muted-foreground">
				<span>{tag}</span>
				<span>{(amount / 100).toFixed(2)}</span>
			</div>
			<div class="h-3 rounded bg-secondary">
				<div class="h-3 rounded bg-orange-500" style={`width: ${toPercent(amount)}%`}></div>
			</div>
		</div>
	{/each}
	<p class="text-xs text-muted-foreground">{m.spending_by_tag()}</p>
</div>
