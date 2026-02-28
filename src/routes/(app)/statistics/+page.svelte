<script lang="ts">
	import IncomeExpenseChart from '$lib/components/stats/income-expense-chart.svelte';
	import MemberBreakdownChart from '$lib/components/stats/member-breakdown-chart.svelte';
	import SavingsRateChart from '$lib/components/stats/savings-rate-chart.svelte';
	import SpendingByTagChart from '$lib/components/stats/spending-by-tag-chart.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();

	const rangeOptions = [
		{ months: 3, label: m.last_3_months() },
		{ months: 6, label: m.last_6_months() },
		{ months: 12, label: m.last_12_months() }
	];

	const rows = $derived(data.stats ?? []);

	function formatOren(value: number): string {
		return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(value / 100);
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-2xl font-semibold">{m.nav_statistics()}</h1>
		<div class="flex flex-wrap gap-2">
			{#each rangeOptions as option}
				<Button
					href={`/statistics?months=${option.months}`}
					variant={data.months === option.months ? 'default' : 'outline'}
					size="sm"
				>
					{option.label}
				</Button>
			{/each}
		</div>
	</div>

	{#if !data.stats || data.stats.length === 0}
		<Card>
			<CardHeader><CardTitle>{m.statistics()}</CardTitle></CardHeader>
			<CardContent>
				<p class="text-sm text-muted-foreground">No budget history available for selected period.</p>
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-6 xl:grid-cols-2">
			<Card>
				<CardHeader><CardTitle>{m.income_vs_expenses()}</CardTitle></CardHeader>
				<CardContent><IncomeExpenseChart data={rows} /></CardContent>
			</Card>

			<Card>
				<CardHeader><CardTitle>{m.savings_rate()}</CardTitle></CardHeader>
				<CardContent><SavingsRateChart data={rows} /></CardContent>
			</Card>

			<Card>
				<CardHeader><CardTitle>{m.spending_by_tag()}</CardTitle></CardHeader>
				<CardContent><SpendingByTagChart data={rows} /></CardContent>
			</Card>

			<Card>
				<CardHeader><CardTitle>{m.per_member()}</CardTitle></CardHeader>
				<CardContent><MemberBreakdownChart data={rows} /></CardContent>
			</Card>
		</div>

		<Card>
			<CardHeader><CardTitle>{m.month_comparison()}</CardTitle></CardHeader>
			<CardContent class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b text-left">
							<th class="py-2">Month</th>
							<th class="py-2">{m.total_income()}</th>
							<th class="py-2">{m.total_expenses()}</th>
							<th class="py-2">{m.savings_rate()}</th>
						</tr>
					</thead>
					<tbody>
						{#each rows as row}
							<tr class="border-b">
								<td class="py-2">{row.year}-{String(row.month).padStart(2, '0')}</td>
								<td class="py-2">{formatOren(row.totalIncome)}</td>
								<td class="py-2">{formatOren(row.totalExpenses)}</td>
								<td class="py-2">{row.savingsRate}%</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</CardContent>
		</Card>
	{/if}
</div>
