<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
		DialogTrigger
	} from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as m from '$lib/paraglide/messages.js';

	let { form } = $props<{ form?: { error?: string } | null }>();
</script>

<Dialog>
	<DialogTrigger>
		{#snippet child({ props })}
			<Button {...props}>{m.create_family()}</Button>
		{/snippet}
	</DialogTrigger>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>{m.create_family()}</DialogTitle>
			<DialogDescription>{m.no_family_description()}</DialogDescription>
		</DialogHeader>

		<form method="POST" action="?/createFamily" use:enhance class="space-y-4">
			{#if form?.error}
				<p class="text-sm text-destructive">{form.error}</p>
			{/if}
			<div class="space-y-2">
				<Label for="family-name">{m.family_name()}</Label>
				<Input id="family-name" name="name" required />
			</div>
			<DialogFooter>
				<Button type="submit">{m.save()}</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
