<script lang="ts">
	import { Bar } from 'svelte-chartjs';
	import { BarElement, CategoryScale, Chart, Legend, LinearScale, Tooltip, type ChartData } from 'chart.js';
	import * as m from '$lib/paraglide/messages.js';

	Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

	type StatsRow = { year: number; month: number; savingsRate: number };
	let { data: monthlyData } = $props<{ data: StatsRow[] }>();

	const chartData = $derived.by(
		() =>
			({
				labels: monthlyData.map((row: StatsRow) => `${row.year}-${String(row.month).padStart(2, '0')}`),
				datasets: [
					{
						label: m.savings_rate(),
						data: monthlyData.map((row: StatsRow) => row.savingsRate),
						backgroundColor: '#22c55e'
					}
				]
			}) satisfies ChartData<'bar'>
	);
</script>

<div class="h-72">
	<Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
</div>
