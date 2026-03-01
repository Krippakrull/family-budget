<script lang="ts">
	import { enhance } from '$app/forms';
	import CreateFamilyDialog from '$lib/components/create-family-dialog.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as m from '$lib/paraglide/messages.js';

	let { data, form } = $props();
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold">{m.nav_family()}</h1>
		<p class="text-sm text-muted-foreground">{m.family_summary()}</p>
	</div>

	{#if !data.family}
		<Card>
			<CardHeader>
				<CardTitle>{m.no_family()}</CardTitle>
				<CardDescription>{m.no_family_description()}</CardDescription>
			</CardHeader>
			<CardContent>
				<CreateFamilyDialog {form} />
			</CardContent>
		</Card>
	{:else}
		<Card>
			<CardHeader>
				<CardTitle>{data.family.name}</CardTitle>
				<CardDescription>{m.members()}: {data.members.length}</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex flex-wrap gap-2">
					{#each data.members as member}
						<Badge variant="secondary">{member.name} ({member.email})</Badge>
					{/each}
				</div>

				<form method="POST" action="?/updateEqualizationMode" use:enhance class="space-y-2">
					<Label for="mode">{m.equalization()}</Label>
					<select
						id="mode"
						name="mode"
						class="h-9 rounded-md border border-input bg-background px-2 text-sm"
						value={data.family.equalizationMode}
					>
						<option value="equal">{m.equal_remainder()}</option>
						<option value="proportional">{m.proportional_income()}</option>
					</select>
					<Button type="submit" size="sm">{m.save()}</Button>
				</form>

				<form method="POST" action="?/updateNotificationSettings" use:enhance class="space-y-3 rounded-md border p-3">
					<p class="text-sm font-medium">{m.notification_settings()}</p>
					<div class="space-y-2">
						<Label for="reminderDay">{m.reminder_day()}</Label>
						<Input
							id="reminderDay"
							name="reminderDay"
							type="number"
							min="1"
							max="28"
							value={data.family.reminderDay}
							required
						/>
						<p class="text-xs text-muted-foreground">{m.reminder_day_help()}</p>
					</div>

					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							name="sendApprovalSummary"
							checked={data.family.sendApprovalSummary}
						/>
						<span>{m.send_approval_summary()}</span>
					</label>

					<Button type="submit" size="sm">{m.save()}</Button>
				</form>

				{#if form && 'notificationSettingsUpdated' in form && form.notificationSettingsUpdated}
					<p class="text-sm text-green-600">{m.settings_saved()}</p>
				{/if}
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>{m.invite_member()}</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<form method="POST" action="?/invite" use:enhance class="flex gap-2">
					<Input type="email" name="email" placeholder="name@example.com" required />
					<Button type="submit">{m.invite_member()}</Button>
				</form>

				{#if form?.inviteSent}
					<p class="text-sm text-green-600">{m.invite_sent()}</p>
				{/if}

				{#if form && 'inviteResent' in form && form.inviteResent}
					<p class="text-sm text-green-600">{m.invite_resent()}</p>
				{/if}

				{#if data.pendingInvites.length > 0}
					<div class="space-y-2">
						<p class="text-sm font-medium">{m.pending_invites()}</p>
						{#each data.pendingInvites as invite}
							<div class="flex items-center justify-between gap-3 rounded-md border p-2 text-sm text-muted-foreground">
								<span class="truncate">{invite.email}</span>
								<form method="POST" action="?/resendInvite" use:enhance>
									<input type="hidden" name="inviteId" value={invite.id} />
									<Button type="submit" size="sm" variant="outline">{m.resend()}</Button>
								</form>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>
	{/if}
</div>
