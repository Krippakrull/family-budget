<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as m from '$lib/paraglide/messages.js';

	let { form } = $props();

	function errorMessage(code: string | undefined): string {
		switch (code) {
			case 'email_and_password_required':
				return m.email_and_password_required();
			case 'invalid_credentials':
				return m.invalid_credentials();
			default:
				return code ?? '';
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card class="w-full max-w-md">
		<CardHeader>
			<CardTitle>{m.app_name()}</CardTitle>
			<CardDescription>{m.login_description()}</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" use:enhance class="space-y-4">
				{#if form?.error}
					<p class="text-sm text-destructive">{errorMessage(form.error)}</p>
				{/if}

				<div class="space-y-2">
					<Label for="email">{m.email()}</Label>
					<Input id="email" name="email" type="email" required value={form?.email ?? ''} />
				</div>

				<div class="space-y-2">
					<Label for="password">{m.password()}</Label>
					<Input id="password" name="password" type="password" required />
				</div>

				<Button type="submit" class="w-full">{m.login()}</Button>

				<p class="text-center text-sm text-muted-foreground">
					{m.no_account()}
					<a href="/register" class="underline">{m.register()}</a>
				</p>
			</form>
		</CardContent>
	</Card>
</div>
