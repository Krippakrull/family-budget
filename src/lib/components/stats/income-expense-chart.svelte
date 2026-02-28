<script lang="ts">
	import { Line } from 'svelte-chartjs';
	import {
		CategoryScale,
		Chart,
		Legend,
		LineElement,
		LinearScale,
		PointElement,
		Title,
		Tooltip,
		type ChartData
	} from 'chart.js';
	import * as m from '$lib/paraglide/messages.js';

	Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

	type StatsRow = { year: number; month: number; totalIncome: number; totalExpenses: number };
	let { data: monthlyData } = $props<{ data: StatsRow[] }>();

	const chartData = $derived.by(
		() =>
			({
				labels: monthlyData.map((row: StatsRow) => `${row.year}-${String(row.month).padStart(2, '0')}`),
				datasets: [
					{
						label: m.income(),
						data: monthlyData.map((row: StatsRow) => row.totalIncome / 100),
						borderColor: 'hsl(var(--primary))',
						backgroundColor: 'hsl(var(--primary))',
						tension: 0.3
					},
					{
						label: m.expenses(),
						data: monthlyData.map((row: StatsRow) => row.totalExpenses / 100),
						borderColor: 'hsl(var(--destructive))',
						backgroundColor: 'hsl(var(--destructive))',
						tension: 0.3
					}
				]
			}) satisfies ChartData<'line'>
	);
</script>

<div class="h-72">
	<Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
</div>
