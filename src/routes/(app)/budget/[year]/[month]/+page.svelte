<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import BudgetCard from '$lib/components/budget-card.svelte';
	import EqualizationPanel from '$lib/components/equalization-panel.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();

	const prevMonth = $derived.by(() => {
		const year = Number.parseInt(page.params.year ?? '', 10);
		const month = Number.parseInt(page.params.month ?? '', 10);
		const targetMonth = month === 1 ? 12 : month - 1;
		const targetYear = month === 1 ? year - 1 : year;
		return `/budget/${targetYear}/${targetMonth}`;
	});

	const nextMonth = $derived.by(() => {
		const year = Number.parseInt(page.params.year ?? '', 10);
		const month = Number.parseInt(page.params.month ?? '', 10);
		const targetMonth = month === 12 ? 1 : month + 1;
		const targetYear = month === 12 ? year + 1 : year;
		return `/budget/${targetYear}/${targetMonth}`;
	});

	const totals = $derived.by(() => {
		if (!data.members) {
			return { income: 0, expenses: 0, remaining: 0 };
		}

		let income = 0;
		let expenses = 0;
		for (const member of data.members) {
			for (const item of member.items) {
				if (item.type === 'income') income += item.amount;
				else expenses += item.amount;
			}
		}

		return { income, expenses, remaining: income - expenses };
	});

	const memberBalances = $derived.by(() => {
		if (!data.members) return [];

		return data.members.map((member) => {
			let totalIncome = 0;
			let totalExpenses = 0;

			for (const item of member.items) {
				if (item.type === 'income') totalIncome += item.amount;
				else totalExpenses += item.amount;
			}

			return {
				userId: member.user.id,
				name: member.user.name,
				totalIncome,
				totalExpenses,
				remainder: totalIncome - totalExpenses
			};
		});
	});

	const monthNames = $derived([
		m.month_january(),
		m.month_february(),
		m.month_march(),
		m.month_april(),
		m.month_may(),
		m.month_june(),
		m.month_july(),
		m.month_august(),
		m.month_september(),
		m.month_october(),
		m.month_november(),
		m.month_december()
	]);

	const headerTitle = $derived(`${page.params.year} ${monthNames[Number(page.params.month) - 1]}`);

	const needsConfirm = $derived(data.needsConfirm === true);

	function formatMonthOption(option: { year: number; month: number }): string {
		return `${option.year} ${monthNames[option.month - 1]}`;
	}

	function formatOren(value: number): string {
		return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(value / 100);
	}
</script>

<div class="space-y-2">
	<div class="flex items-center justify-between gap-2">
		<div>
			<h1 class="text-2xl font-semibold">{m.nav_budget()} {headerTitle}</h1>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" href={prevMonth}>←</Button>
			<Button variant="outline" size="sm" href={nextMonth}>→</Button>
		</div>
	</div>

	{#if data.needsFamily}
		<Card>
			<CardHeader>
				<CardTitle>{m.no_family()}</CardTitle>
				<CardDescription>{m.no_family_description()}</CardDescription>
			</CardHeader>
			<CardContent>
				<Button href="/family">{m.nav_family()}</Button>
			</CardContent>
		</Card>
	{:else if data.invalidDate}
		<Card>
			<CardHeader>
				<CardTitle>Invalid date</CardTitle>
			</CardHeader>
		</Card>
	{:else if data.needsSetup}
		<Card>
			<CardHeader>
				<CardTitle>{m.setup_budget()}</CardTitle>
				<CardDescription>{m.start_fresh()} or {m.copy_from_month()}</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<form method="POST" action="?/createFromScratch" use:enhance>
					<Button type="submit">{m.start_fresh()}</Button>
				</form>

				{#if (data.availableMonths ?? []).length > 0}
					<form method="POST" action="?/copyFromMonth" use:enhance class="flex flex-wrap gap-2">
						<select name="sourceMonth" class="h-9 rounded-md border border-input bg-background px-2 text-sm">
							{#each data.availableMonths as option}
								<option value={`${option.year}-${option.month}`}>{formatMonthOption(option)}</option>
							{/each}
						</select>
						<Button type="submit" variant="secondary">{m.copy_from_month()}</Button>
					</form>
				{/if}
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-6 md:grid-cols-2">
			{#each data.members as member}
				<BudgetCard
					{member}
					currentUserId={data.currentUserId ?? ''}
					familyTags={data.familyTags ?? []}
					currentLanguage={data.currentLanguage ?? 'sv'}
				/>
			{/each}
		</div>

		<Card>
			<CardHeader>
				<CardTitle>{m.family_summary()}</CardTitle>
			</CardHeader>
			<CardContent class="space-y-1 text-sm">
				<p>{m.total_income()}: {formatOren(totals.income)}</p>
				<p>{m.total_expenses()}: {formatOren(totals.expenses)}</p>
				<p class="font-medium">{m.total_remaining()}: {formatOren(totals.remaining)}</p>
			</CardContent>
		</Card>

		<EqualizationPanel members={memberBalances} mode={data.equalizationMode ?? 'equal'} />

		{#if (data.copyAvailableMonths ?? []).length > 0}
			<Card>
				<CardHeader>
					<CardTitle>{m.copy_from_month()}</CardTitle>
				</CardHeader>
				<CardContent>
					<form method="POST" action="?/copyFromMonthExisting" use:enhance class="flex flex-wrap gap-2 items-end">
						{#if needsConfirm}
							<input type="hidden" name="confirmed" value="yes" />
							<input type="hidden" name="sourceMonth" value={data.sourceMonth} />
							<p class="w-full text-sm text-muted-foreground">{m.copy_from_month_confirm()}</p>
							<Button type="submit" variant="secondary">{m.confirm_copy()}</Button>
						{:else}
							<select name="sourceMonth" class="h-9 rounded-md border border-input bg-background px-2 text-sm">
								{#each data.copyAvailableMonths as option}
									<option value={`${option.year}-${option.month}`}>{formatMonthOption(option)}</option>
								{/each}
							</select>
							<Button type="submit" variant="secondary">{m.copy_from_month()}</Button>
						{/if}
					</form>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>
