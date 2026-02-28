<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';

	type StatsRow = { year: number; month: number; totalIncome: number; totalExpenses: number };
	let { data: monthlyData } = $props<{ data: StatsRow[] }>();

	const maxValue = $derived.by(() => {
		let max = 1;
		for (const row of monthlyData) {
			max = Math.max(max, row.totalIncome, row.totalExpenses);
		}
		return max;
	});

	function toPercent(value: number): number {
		return Math.max(0, Math.min(100, Math.round((value / maxValue) * 100)));
	}
</script>

<div class="space-y-3">
	{#each monthlyData as row}
		<div class="space-y-1">
			<p class="text-xs text-muted-foreground">{row.year}-{String(row.month).padStart(2, '0')}</p>
			<div class="space-y-1">
				<div class="h-3 rounded bg-primary/20" style={`width: ${toPercent(row.totalIncome)}%`}></div>
				<div class="h-3 rounded bg-destructive/20" style={`width: ${toPercent(row.totalExpenses)}%`}></div>
			</div>
			<p class="text-xs text-muted-foreground">{m.income()} / {m.expenses()}</p>
		</div>
	{/each}
</div>
