<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';

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


	const maxTotal = $derived.by(() => {
		let max = 1;
		for (const member of aggregatedMembers) {
			max = Math.max(max, member.income + member.expenses);
		}
		return max;
	});

	function toPercent(value: number): number {
		return Math.max(0, Math.min(100, Math.round((value / maxTotal) * 100)));
	}
</script>

<div class="space-y-3">
	{#each aggregatedMembers as member}
		<div class="space-y-1">
			<div class="flex items-center justify-between text-xs text-muted-foreground">
				<span>{member.name}</span>
				<span>{m.income()} / {m.expenses()}</span>
			</div>
			<div class="flex h-3 w-full overflow-hidden rounded bg-secondary">
				<div class="h-3 bg-emerald-500" style={`width: ${toPercent(member.income)}%`}></div>
				<div class="h-3 bg-rose-500" style={`width: ${toPercent(member.expenses)}%`}></div>
			</div>
		</div>
	{/each}
</div>
