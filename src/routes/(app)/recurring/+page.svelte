<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatCurrencyInputValue } from '$lib/currency.js';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();
	const amountPlaceholder = $derived(data.currentLanguage === 'sv' ? '0,00' : '0.00');

	const incomes = $derived(data.templates.filter((t) => t.type === 'income'));
	const expenses = $derived(data.templates.filter((t) => t.type === 'expense'));
</script>

<div class="space-y-6">
	<h1 class="text-2xl font-semibold">{m.nav_recurring()}</h1>

	<div class="grid gap-6 lg:grid-cols-2">
		<Card>
			<CardHeader>
				<CardTitle>{m.income()}</CardTitle>
			</CardHeader>
			<CardContent class="space-y-3">
				{#each incomes as template}
					<div class="space-y-2 rounded-md border p-3">
						<form method="POST" action="?/update" use:enhance class="grid gap-2 md:grid-cols-[1fr_120px_auto]">
							<input type="hidden" name="id" value={template.id} />
							<Input name="name" value={template.name} required />
							<Input
								name="amount"
								type="text"
								inputmode="decimal"
								value={formatCurrencyInputValue(template.amount, data.currentLanguage)}
								required
							/>
							<Button type="submit" size="sm">{m.save()}</Button>
						</form>

						<div class="flex flex-wrap gap-2">
							{#each template.tags as tag}
								<Badge variant="secondary" class="gap-2">
									{tag.name}
									<form method="POST" action="?/removeTag" use:enhance>
										<input type="hidden" name="templateId" value={template.id} />
										<input type="hidden" name="tagId" value={tag.id} />
										<Button type="submit" size="icon" variant="ghost" class="size-5">×</Button>
									</form>
								</Badge>
							{/each}
						</div>

						<form method="POST" action="?/addTag" use:enhance class="flex gap-2">
							<input type="hidden" name="templateId" value={template.id} />
							<Input name="tagName" list={`template-tags-${template.id}`} placeholder={m.add_tag()} />
							<datalist id={`template-tags-${template.id}`}>
								{#each data.familyTags as tag}
									<option value={tag.name}></option>
								{/each}
							</datalist>
							<Button type="submit" size="sm" variant="outline">{m.add()}</Button>
						</form>

						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="id" value={template.id} />
							<Button type="submit" size="sm" variant="destructive">{m.delete_item()}</Button>
						</form>
					</div>
				{/each}

				<form method="POST" action="?/add" use:enhance class="space-y-2 rounded-md border p-3">
					<input type="hidden" name="type" value="income" />
					<Input name="name" placeholder={m.add_income()} required />
					<Input name="amount" type="text" inputmode="decimal" placeholder={amountPlaceholder} required />
					<Button type="submit">{m.add_income()}</Button>
				</form>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>{m.expenses()}</CardTitle>
			</CardHeader>
			<CardContent class="space-y-3">
				{#each expenses as template}
					<div class="space-y-2 rounded-md border p-3">
						<form method="POST" action="?/update" use:enhance class="grid gap-2 md:grid-cols-[1fr_120px_auto]">
							<input type="hidden" name="id" value={template.id} />
							<Input name="name" value={template.name} required />
							<Input
								name="amount"
								type="text"
								inputmode="decimal"
								value={formatCurrencyInputValue(template.amount, data.currentLanguage)}
								required
							/>
							<Button type="submit" size="sm">{m.save()}</Button>
						</form>

						<div class="flex flex-wrap gap-2">
							{#each template.tags as tag}
								<Badge variant="secondary" class="gap-2">
									{tag.name}
									<form method="POST" action="?/removeTag" use:enhance>
										<input type="hidden" name="templateId" value={template.id} />
										<input type="hidden" name="tagId" value={tag.id} />
										<Button type="submit" size="icon" variant="ghost" class="size-5">×</Button>
									</form>
								</Badge>
							{/each}
						</div>

						<form method="POST" action="?/addTag" use:enhance class="flex gap-2">
							<input type="hidden" name="templateId" value={template.id} />
							<Input name="tagName" list={`template-tags-exp-${template.id}`} placeholder={m.add_tag()} />
							<datalist id={`template-tags-exp-${template.id}`}>
								{#each data.familyTags as tag}
									<option value={tag.name}></option>
								{/each}
							</datalist>
							<Button type="submit" size="sm" variant="outline">{m.add()}</Button>
						</form>

						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="id" value={template.id} />
							<Button type="submit" size="sm" variant="destructive">{m.delete_item()}</Button>
						</form>
					</div>
				{/each}

				<form method="POST" action="?/add" use:enhance class="space-y-2 rounded-md border p-3">
					<input type="hidden" name="type" value="expense" />
					<Input name="name" placeholder={m.add_expense()} required />
					<Input name="amount" type="text" inputmode="decimal" placeholder={amountPlaceholder} required />
					<Button type="submit" variant="secondary">{m.add_expense()}</Button>
				</form>
			</CardContent>
		</Card>
	</div>
</div>
