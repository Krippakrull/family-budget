<script lang="ts">
	import { enhance } from '$app/forms';
	import BudgetItemRow from './budget-item-row.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as m from '$lib/paraglide/messages.js';

	type Tag = { id: string; name: string };
	type BudgetItem = {
		id: string;
		name: string;
		amount: number;
		type: 'income' | 'expense';
		isRecurring: boolean;
		tags: Tag[];
	};

	type MemberBlock = {
		memberBudget: { id: string; approved: boolean };
		user: { id: string; name: string };
		items: BudgetItem[];
	};

	let { member, currentUserId, familyTags, currentLanguage } = $props<{
		member: MemberBlock;
		currentUserId: string;
		familyTags: Tag[];
		currentLanguage: 'sv' | 'en';
	}>();

	const amountPlaceholder = $derived(currentLanguage === 'sv' ? '0,00' : '0.00');

	const canEdit = $derived(member.user.id === currentUserId && !member.memberBudget.approved);
	const incomes = $derived.by(() => member.items.filter((item: BudgetItem) => item.type === 'income'));
	const expenses = $derived.by(() => member.items.filter((item: BudgetItem) => item.type === 'expense'));
	const totalIncome = $derived.by(() => incomes.reduce((sum: number, item: BudgetItem) => sum + item.amount, 0));
	const totalExpenses = $derived.by(() =>
		expenses.reduce((sum: number, item: BudgetItem) => sum + item.amount, 0)
	);
	const remaining = $derived(totalIncome - totalExpenses);

	function formatOren(value: number): string {
		return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(value / 100);
	}
</script>

<Card>
	<CardHeader>
		<CardTitle>{member.user.name}</CardTitle>
		<CardDescription>
			{m.total_income()}: {formatOren(totalIncome)} · {m.total_expenses()}: {formatOren(totalExpenses)} · {m.remaining()}: {formatOren(remaining)}
		</CardDescription>
	</CardHeader>
	<CardContent class="space-y-4">
		{#if canEdit}
			<div class="grid gap-2 md:grid-cols-2">
				<form method="POST" action="?/addItem" use:enhance class="space-y-2 rounded-md border p-3">
					<input type="hidden" name="memberBudgetId" value={member.memberBudget.id} />
					<input type="hidden" name="type" value="income" />
					<Input name="name" placeholder={m.add_income()} required />
					<Input name="amount" type="text" inputmode="decimal" placeholder={amountPlaceholder} required />
					<Button type="submit" size="sm">{m.add_income()}</Button>
				</form>

				<form method="POST" action="?/addItem" use:enhance class="space-y-2 rounded-md border p-3">
					<input type="hidden" name="memberBudgetId" value={member.memberBudget.id} />
					<input type="hidden" name="type" value="expense" />
					<Input name="name" placeholder={m.add_expense()} required />
					<Input name="amount" type="text" inputmode="decimal" placeholder={amountPlaceholder} required />
					<Button type="submit" size="sm" variant="secondary">{m.add_expense()}</Button>
				</form>
			</div>
		{/if}

		<div class="space-y-2">
			{#each member.items as item}
				<BudgetItemRow {item} editable={canEdit} {familyTags} {currentLanguage} />
			{/each}
			{#if member.items.length === 0}
				<p class="text-sm text-muted-foreground">No items yet.</p>
			{/if}
		</div>

		{#if member.user.id === currentUserId}
			<form method="POST" action="?/toggleApproval" use:enhance>
				<input type="hidden" name="memberBudgetId" value={member.memberBudget.id} />
				<Button type="submit" variant={member.memberBudget.approved ? 'outline' : 'default'}>
					{member.memberBudget.approved ? m.unapprove() : m.approve()}
				</Button>
			</form>
		{/if}
	</CardContent>
</Card>
