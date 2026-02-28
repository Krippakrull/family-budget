<script lang="ts">
	import { Bar, Pie } from 'svelte-chartjs';
	import {
		ArcElement,
		BarElement,
		CategoryScale,
		Chart,
		Legend,
		LinearScale,
		Tooltip,
		type ChartData
	} from 'chart.js';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages.js';

	Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Legend, Tooltip);

	let { data } = $props();

	const remaining = $derived(data.summary ? data.summary.totalIncome - data.summary.totalExpenses : 0);

	const tagRows = $derived.by(() => {
		if (!data.summary) return [] as { name: string; income: number; expenses: number }[];
		return Object.entries(data.summary.byTag).map(([name, totals]) => ({
			name,
			income: totals.income,
			expenses: totals.expenses
		}));
	});

	const expenseByTagChartData = $derived.by(() => {
		const rows = tagRows.filter((row) => row.expenses > 0);
		return {
			labels: rows.map((row) => row.name),
			datasets: [
				{
					label: m.expenses(),
					data: rows.map((row) => row.expenses / 100),
					backgroundColor: ['#3b82f6', '#16a34a', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6']
				}
			]
		} satisfies ChartData<'pie'>;
	});

	const memberBreakdownChartData = $derived.by(() => {
		const members = data.summary?.byMember ?? [];
		return {
			labels: members.map((member) => member.name),
			datasets: [
				{
					label: m.income(),
					data: members.map((member) => member.income / 100),
					backgroundColor: '#16a34a'
				},
				{
					label: m.expenses(),
					data: members.map((member) => member.expenses / 100),
					backgroundColor: '#ef4444'
				}
			]
		} satisfies ChartData<'bar'>;
	});

	function formatOren(value: number): string {
		return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(value / 100);
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between gap-2">
		<h1 class="text-2xl font-semibold">{m.summary()}</h1>
		<Button href={`/budget/${data.year}/${data.month}`} variant="outline">{m.nav_budget()}</Button>
	</div>

	{#if !data.summary}
		<Card>
			<CardHeader>
				<CardTitle>{m.summary()}</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-muted-foreground">No budget data found for this month.</p>
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-4 md:grid-cols-3">
			<Card>
				<CardHeader><CardTitle>{m.total_income()}</CardTitle></CardHeader>
				<CardContent>{formatOren(data.summary.totalIncome)}</CardContent>
			</Card>
			<Card>
				<CardHeader><CardTitle>{m.total_expenses()}</CardTitle></CardHeader>
				<CardContent>{formatOren(data.summary.totalExpenses)}</CardContent>
			</Card>
			<Card>
				<CardHeader><CardTitle>{m.total_remaining()}</CardTitle></CardHeader>
				<CardContent>{formatOren(remaining)}</CardContent>
			</Card>
		</div>

		<div class="grid gap-6 lg:grid-cols-2">
			<Card>
				<CardHeader><CardTitle>{m.spending_by_tag()}</CardTitle></CardHeader>
				<CardContent class="space-y-4">
					<div class="h-64">
						<Pie data={expenseByTagChartData} options={{ responsive: true, maintainAspectRatio: false }} />
					</div>
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b text-left">
									<th class="py-2">Tag</th>
									<th class="py-2">{m.income()}</th>
									<th class="py-2">{m.expenses()}</th>
								</tr>
							</thead>
							<tbody>
								{#each tagRows as row}
									<tr class="border-b">
										<td class="py-2">{row.name}</td>
										<td class="py-2">{formatOren(row.income)}</td>
										<td class="py-2">{formatOren(row.expenses)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader><CardTitle>{m.per_member()}</CardTitle></CardHeader>
				<CardContent class="space-y-4">
					<div class="h-64">
						<Bar
							data={memberBreakdownChartData}
							options={{ responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }}
						/>
					</div>
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b text-left">
									<th class="py-2">{m.members()}</th>
									<th class="py-2">{m.income()}</th>
									<th class="py-2">{m.expenses()}</th>
									<th class="py-2">{m.remaining()}</th>
								</tr>
							</thead>
							<tbody>
								{#each data.summary.byMember as member}
									<tr class="border-b">
										<td class="py-2">{member.name}</td>
										<td class="py-2">{formatOren(member.income)}</td>
										<td class="py-2">{formatOren(member.expenses)}</td>
										<td class="py-2">{formatOren(member.income - member.expenses)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
		</div>
	{/if}
</div>
