<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages.js';

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

	const maxTagExpense = $derived.by(() => {
		let max = 1;
		for (const row of tagRows) {
			max = Math.max(max, row.expenses);
		}
		return max;
	});

	const maxMemberTotal = $derived.by(() => {
		let max = 1;
		for (const member of data.summary?.byMember ?? []) {
			max = Math.max(max, member.income + member.expenses);
		}
		return max;
	});

	function barWidth(value: number, max: number): number {
		return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
	}

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
					<div class="space-y-2">
						{#each tagRows as row}
							<div class="space-y-1">
								<div class="flex items-center justify-between text-xs text-muted-foreground">
									<span>{row.name}</span>
									<span>{formatOren(row.expenses)}</span>
								</div>
								<div class="h-3 rounded bg-secondary">
									<div
										class="h-3 rounded bg-orange-500"
										style={`width: ${barWidth(row.expenses, maxTagExpense)}%`}
									></div>
								</div>
							</div>
						{/each}
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
					<div class="space-y-2">
						{#each data.summary.byMember as member}
							<div class="space-y-1">
								<p class="text-xs text-muted-foreground">{member.name}</p>
								<div class="flex h-3 w-full overflow-hidden rounded bg-secondary">
									<div
										class="h-3 bg-emerald-500"
										style={`width: ${barWidth(member.income, maxMemberTotal)}%`}
									></div>
									<div
										class="h-3 bg-rose-500"
										style={`width: ${barWidth(member.expenses, maxMemberTotal)}%`}
									></div>
								</div>
							</div>
						{/each}
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
