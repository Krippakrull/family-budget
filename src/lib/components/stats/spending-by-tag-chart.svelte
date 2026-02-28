<script lang="ts">
	import { Bar } from 'svelte-chartjs';
	import { BarElement, CategoryScale, Chart, Legend, LinearScale, Tooltip, type ChartData } from 'chart.js';
	import * as m from '$lib/paraglide/messages.js';

	Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

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

	const chartData = $derived.by(() => {
		const rows = (Object.entries(aggregatedTagTotals) as Array<[string, number]>).sort((a, b) => b[1] - a[1]);
		return {
			labels: rows.map(([tag]) => tag),
			datasets: [
				{
					label: m.spending_by_tag(),
					data: rows.map(([, amount]) => amount / 100),
					backgroundColor: '#f97316'
				}
			]
		} satisfies ChartData<'bar'>;
	});
</script>

<div class="h-72">
	<Bar
		data={chartData}
		options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const }}
	/>
</div>
