<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';

	type StatsRow = { year: number; month: number; savingsRate: number };
	let { data: monthlyData } = $props<{ data: StatsRow[] }>();

	function toPercent(value: number): number {
		return Math.max(0, Math.min(100, value));
	}
</script>

<div class="space-y-3">
	{#each monthlyData as row}
		<div class="space-y-1">
			<div class="flex items-center justify-between text-xs text-muted-foreground">
				<span>{row.year}-{String(row.month).padStart(2, '0')}</span>
				<span>{row.savingsRate}%</span>
			</div>
			<div class="h-3 rounded bg-secondary">
				<div class="h-3 rounded bg-emerald-500" style={`width: ${toPercent(row.savingsRate)}%`}></div>
			</div>
		</div>
	{/each}
	<p class="text-xs text-muted-foreground">{m.savings_rate()}</p>
</div>
