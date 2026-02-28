<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages.js';
	import { Button } from '$lib/components/ui/button';

	const now = new Date();

	function parseBudgetPath(pathname: string): { year: number; month: number } {
		const match = pathname.match(/^\/budget\/(\d{4})\/(\d{1,2})(?:\/|$)/);
		if (!match) {
			return { year: now.getFullYear(), month: now.getMonth() + 1 };
		}

		const year = Number(match[1]);
		const month = Number(match[2]);
		if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
			return { year: now.getFullYear(), month: now.getMonth() + 1 };
		}

		return { year, month };
	}

	const current = $derived(parseBudgetPath(page.url.pathname));
	let selectedYear = $state(now.getFullYear());
	let selectedMonth = $state(now.getMonth() + 1);

	const monthNames = [
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
	];

	const yearOptions = Array.from({ length: 7 }, (_, index) => now.getFullYear() - 3 + index);

	$effect(() => {
		selectedYear = current.year;
		selectedMonth = current.month;
	});

	async function navigate(year: number, month: number): Promise<void> {
		await goto(`/budget/${year}/${month}`);
	}

	async function goToPreviousMonth(): Promise<void> {
		const prevMonth = current.month === 1 ? 12 : current.month - 1;
		const prevYear = current.month === 1 ? current.year - 1 : current.year;
		await navigate(prevYear, prevMonth);
	}

	async function goToNextMonth(): Promise<void> {
		const nextMonth = current.month === 12 ? 1 : current.month + 1;
		const nextYear = current.month === 12 ? current.year + 1 : current.year;
		await navigate(nextYear, nextMonth);
	}

	async function jumpToSelectedMonth(): Promise<void> {
		await navigate(selectedYear, selectedMonth);
	}
</script>

<div class="space-y-2 rounded-md border p-3">
	<div class="flex items-center justify-between gap-2">
		<Button type="button" variant="outline" size="sm" onclick={goToPreviousMonth}>←</Button>
		<p class="text-sm font-medium">{monthNames[current.month - 1]} {current.year}</p>
		<Button type="button" variant="outline" size="sm" onclick={goToNextMonth}>→</Button>
	</div>

	<div class="grid grid-cols-2 gap-2">
		<select
			class="h-9 rounded-md border border-input bg-background px-2 text-sm"
			bind:value={selectedMonth}
			onchange={jumpToSelectedMonth}
		>
			{#each monthNames as monthName, index}
				<option value={index + 1}>{monthName}</option>
			{/each}
		</select>

		<select
			class="h-9 rounded-md border border-input bg-background px-2 text-sm"
			bind:value={selectedYear}
			onchange={jumpToSelectedMonth}
		>
			{#each yearOptions as year}
				<option value={year}>{year}</option>
			{/each}
		</select>
	</div>
</div>
