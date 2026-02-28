<script lang="ts">
	import { enhance } from '$app/forms';
	import { accents } from '$lib/theme';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as m from '$lib/paraglide/messages.js';

	let { data, form } = $props();

	const accentClasses: Record<(typeof accents)[number], string> = {
		blue: 'bg-blue-500',
		green: 'bg-green-500',
		purple: 'bg-purple-500',
		amber: 'bg-amber-500'
	};

	function errorMessage(code: string | undefined): string {
		switch (code) {
			case 'all_fields_required':
				return m.all_fields_required();
			case 'password_too_short':
				return m.password_too_short();
			case 'invalid_current_password':
				return m.invalid_current_password();
			case 'name_required':
				return m.name_required();
			default:
				return code ?? '';
		}
	}
</script>

<div class="space-y-6">
	<h1 class="text-2xl font-semibold">{m.nav_settings()}</h1>

	<Card>
		<CardHeader>
			<CardTitle>{m.settings()}</CardTitle>
			<CardDescription>{m.language()}</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" action="?/updateProfile" use:enhance class="grid gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="name">{m.name()}</Label>
					<Input id="name" name="name" value={data.user?.name ?? ''} required />
				</div>

				<div class="space-y-2">
					<Label for="language">{m.language()}</Label>
					<select
						id="language"
						name="language"
						class="h-11 rounded-md border border-input bg-background px-3 text-sm"
						value={data.user?.language ?? 'sv'}
					>
						<option value="sv">Svenska</option>
						<option value="en">English</option>
					</select>
				</div>

				<div class="md:col-span-2">
					<Button type="submit">{m.save()}</Button>
				</div>
			</form>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>{m.theme()}</CardTitle>
			<CardDescription>{m.accent_color()}</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<form method="POST" action="?/updateTheme" use:enhance class="space-y-4">
				<div class="space-y-2">
					<Label for="theme">{m.theme()}</Label>
					<select
						id="theme"
						name="theme"
						class="h-11 rounded-md border border-input bg-background px-3 text-sm"
						value={data.user?.theme ?? 'light'}
					>
						<option value="light">{m.light()}</option>
						<option value="dark">{m.dark()}</option>
					</select>
				</div>

				<div class="space-y-2">
					<Label>{m.accent_color()}</Label>
					<div class="flex flex-wrap gap-2">
						{#each accents as accent}
							<label class="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
								<input
									type="radio"
									name="accentColor"
									value={accent}
									checked={data.user?.accentColor === accent}
								/>
								<span class={`size-3 rounded-full ${accentClasses[accent]}`}></span>
								<span class="capitalize">{accent}</span>
							</label>
						{/each}
					</div>
				</div>

				<Button type="submit">{m.save()}</Button>
			</form>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>{m.change_password()}</CardTitle>
		</CardHeader>
		<CardContent>
			<form method="POST" action="?/changePassword" use:enhance class="space-y-4">
				{#if form?.error}
					<p class="text-sm text-destructive">{errorMessage(form.error)}</p>
				{/if}

				<div class="space-y-2">
					<Label for="currentPassword">{m.current_password()}</Label>
					<Input id="currentPassword" name="currentPassword" type="password" required />
				</div>

				<div class="space-y-2">
					<Label for="newPassword">{m.new_password()}</Label>
					<Input id="newPassword" name="newPassword" type="password" required minlength={8} />
				</div>

				<Button type="submit">{m.change_password()}</Button>
			</form>
		</CardContent>
	</Card>
</div>
