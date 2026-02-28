<script lang="ts">
	import { enhance } from '$app/forms';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import TagInput from './tag-input.svelte';
	import * as m from '$lib/paraglide/messages.js';

	type ItemTag = { id: string; name: string };
	type BudgetItem = {
		id: string;
		name: string;
		amount: number;
		type: 'income' | 'expense';
		isRecurring: boolean;
		tags: ItemTag[];
	};

	type FamilyTag = { id: string; name: string };

	let { item, editable, familyTags } = $props<{
		item: BudgetItem;
		editable: boolean;
		familyTags: FamilyTag[];
	}>();

	function formatOren(value: number): string {
		return `${(value / 100).toFixed(2)}`;
	}
</script>

<div class="space-y-2 rounded-md border p-3">
	<div class="flex flex-wrap items-center gap-2">
		<Badge variant={item.type === 'income' ? 'default' : 'secondary'}>
			{item.type === 'income' ? m.income() : m.expenses()}
		</Badge>
		{#if item.isRecurring}
			<Badge variant="outline">{m.recurring_items()}</Badge>
		{/if}
	</div>

	{#if editable}
		<form method="POST" action="?/updateItem" use:enhance class="grid grid-cols-1 gap-2 md:grid-cols-[1fr_140px_auto]">
			<input type="hidden" name="itemId" value={item.id} />
			<Input name="name" value={item.name} required />
			<Input name="amount" type="number" step="1" value={item.amount} required />
			<Button type="submit" size="sm">{m.save()}</Button>
		</form>

		<div class="flex flex-wrap gap-2">
			<form method="POST" action="?/toggleRecurring" use:enhance>
				<input type="hidden" name="itemId" value={item.id} />
				<Button type="submit" size="sm" variant="outline">
					{item.isRecurring ? m.cancel() : m.recurring_items()}
				</Button>
			</form>

			<form method="POST" action="?/deleteItem" use:enhance>
				<input type="hidden" name="itemId" value={item.id} />
				<Button type="submit" size="sm" variant="destructive">{m.delete_item()}</Button>
			</form>
		</div>
	{:else}
		<div class="flex items-center justify-between gap-4">
			<p class="font-medium">{item.name}</p>
			<p class="text-sm text-muted-foreground">{formatOren(item.amount)} SEK</p>
		</div>
	{/if}

	<div class="flex flex-wrap gap-2">
		{#each item.tags as tag}
			<Badge variant="secondary" class="gap-2">
				{tag.name}
				{#if editable}
					<form method="POST" action="?/removeTag" use:enhance>
						<input type="hidden" name="itemId" value={item.id} />
						<input type="hidden" name="tagId" value={tag.id} />
						<Button size="icon" variant="ghost" class="size-5" type="submit">×</Button>
					</form>
				{/if}
			</Badge>
		{/each}
	</div>

	{#if editable}
		<TagInput itemId={item.id} {familyTags} />
	{/if}
</div>
