<script lang="ts">
	import { Bar } from 'svelte-chartjs';
	import { BarElement, CategoryScale, Chart, Legend, LinearScale, Tooltip, type ChartData } from 'chart.js';
	import * as m from '$lib/paraglide/messages.js';

	Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

	type MemberRow = { name: string; income: number; expenses: number };
	type StatsRow = { memberData: MemberRow[] };
	let { data: monthlyData } = $props<{ data: StatsRow[] }>();

	const aggregatedMembers = $derived.by(() => {
		const map = new Map<string, { income: number; expenses: number }>();
		for (const row of monthlyData) {
			for (const member of row.memberData) {
				const current = map.get(member.name) ?? { income: 0, expenses: 0 };
				current.income += member.income;
				current.expenses += member.expenses;
				map.set(member.name, current);
			}
		}
		return Array.from(map.entries()).map(([name, totals]) => ({ name, ...totals }));
	});

	const chartData = $derived.by(
		() =>
			({
				labels: aggregatedMembers.map((member) => member.name),
				datasets: [
					{
						label: m.income(),
						data: aggregatedMembers.map((member) => member.income / 100),
						backgroundColor: '#22c55e'
					},
					{
						label: m.expenses(),
						data: aggregatedMembers.map((member) => member.expenses / 100),
						backgroundColor: '#ef4444'
					}
				]
			}) satisfies ChartData<'bar'>
	);
</script>

<div class="h-72">
	<Bar
		data={chartData}
		options={{ responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }}
	/>
</div>
