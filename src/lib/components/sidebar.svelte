<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages.js';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import MonthPicker from './month-picker.svelte';
	import ThemeSwitcher from './theme-switcher.svelte';

	type SidebarUser = {
		name: string;
		theme: 'light' | 'dark';
		accentColor: string;
	} | null;

	type SidebarFamily = {
		name: string;
	} | null;

	let { user, family, mobile = false } = $props<{ user: SidebarUser; family: SidebarFamily; mobile?: boolean }>();

	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth() + 1;

	const navItems = [
		{ href: `/budget/${currentYear}/${currentMonth}`, match: '/budget', label: m.nav_budget() },
		{ href: '/recurring', match: '/recurring', label: m.nav_recurring() },
		{ href: '/statistics', match: '/statistics', label: m.nav_statistics() }
	];
</script>

<aside class="flex h-full flex-col bg-card p-4" class:w-64={!mobile} class:w-full={mobile} class:border-r={!mobile}>
	<div class="mb-4">
		<h1 class="line-clamp-1 text-lg font-semibold">{family?.name ?? m.app_name()}</h1>
	</div>

	<nav class="flex-1 space-y-1">
		{#each navItems as item}
			<a
				href={item.href}
				class="flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
				class:bg-accent={page.url.pathname.startsWith(item.match)}
			>
				{item.label}
			</a>
		{/each}

		<Separator class="my-3" />

		<MonthPicker />
	</nav>

	<div class="space-y-2">
		<Separator />
		<a href="/settings" class="flex min-h-11 items-center rounded-md px-3 py-2 text-sm hover:bg-accent">
			{m.nav_settings()}
		</a>
		<a href="/family" class="flex min-h-11 items-center rounded-md px-3 py-2 text-sm hover:bg-accent">
			{m.nav_family()}
		</a>
		<Separator />
		<div class="flex items-center justify-between px-3 py-2">
			<span class="text-sm text-muted-foreground">{user?.name}</span>
			<form method="POST" action="/logout">
				<Button variant="ghost" size="sm" type="submit">{m.logout()}</Button>
			</form>
		</div>
		{#if !mobile}
			<ThemeSwitcher user={user} />
		{/if}
	</div>
</aside>
