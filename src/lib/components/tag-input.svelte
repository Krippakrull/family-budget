<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as m from '$lib/paraglide/messages.js';

	type FamilyTag = { id: string; name: string };

	let { itemId, familyTags, disabled = false } = $props<{
		itemId: string;
		familyTags: FamilyTag[];
		disabled?: boolean;
	}>();
</script>

<form method="POST" action="?/addTag" use:enhance class="flex items-center gap-2">
	<input type="hidden" name="itemId" value={itemId} />
	<Input
		name="tagName"
		placeholder={m.add_tag()}
		list={`tags-${itemId}`}
		disabled={disabled}
		class="h-8"
	/>
	<datalist id={`tags-${itemId}`}>
		{#each familyTags as tag}
			<option value={tag.name}></option>
		{/each}
	</datalist>
	<Button type="submit" size="sm" disabled={disabled}>{m.add()}</Button>
</form>
