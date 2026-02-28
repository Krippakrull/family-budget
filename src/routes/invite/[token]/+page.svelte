<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as m from '$lib/paraglide/messages.js';

	let { data, form } = $props();

	function errorMessage(code: string | undefined): string {
		switch (code) {
			case 'all_fields_required':
				return m.all_fields_required();
			case 'password_too_short':
				return m.password_too_short();
			case 'email_already_registered':
				return m.email_already_registered();
			case 'invalid_invite':
				return 'Invalid invite';
			default:
				return code ?? '';
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card class="w-full max-w-md">
		<CardHeader>
			<CardTitle>{m.join_family()}</CardTitle>
			<CardDescription>
				{#if data.valid}
					{data.family?.name}
				{:else}
					Invalid or expired invite
				{/if}
			</CardDescription>
		</CardHeader>

		<CardContent>
			{#if !data.valid}
				<p class="text-sm text-muted-foreground">This invite link has expired or already been used.</p>
			{:else if data.isLoggedIn}
				<form method="POST" action="?/join" use:enhance class="space-y-4">
					<Button type="submit" class="w-full">{m.join_family()}</Button>
				</form>
			{:else}
				<form method="POST" action="?/register" use:enhance class="space-y-4">
					{#if form?.error}
						<p class="text-sm text-destructive">{errorMessage(form.error)}</p>
					{/if}

					<div class="space-y-2">
						<Label for="email">{m.email()}</Label>
						<Input id="email" name="email" type="email" value={data.invite?.email ?? ''} required />
					</div>

					<div class="space-y-2">
						<Label for="name">{m.name()}</Label>
						<Input id="name" name="name" required />
					</div>

					<div class="space-y-2">
						<Label for="password">{m.password()}</Label>
						<Input id="password" name="password" type="password" required minlength={8} />
					</div>

					<Button type="submit" class="w-full">{m.register()}</Button>
				</form>
			{/if}
		</CardContent>
	</Card>
</div>
