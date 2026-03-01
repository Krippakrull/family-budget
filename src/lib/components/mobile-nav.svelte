<script lang="ts">
	import { page } from '$app/state';
	import Sidebar from './sidebar.svelte';
	import { Sheet, SheetContent, SheetTrigger } from '$lib/components/ui/sheet';
	import * as m from '$lib/paraglide/messages.js';

	type MobileUser = {
		name: string;
		theme: 'light' | 'dark';
		accentColor: string;
	} | null;

	type MobileFamily = {
		name: string;
	} | null;

	let { user, family } = $props<{ user: MobileUser; family: MobileFamily }>();
	let isMenuOpen = $state(false);

	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth() + 1;

	const navItems = [
		{ href: `/budget/${currentYear}/${currentMonth}`, match: '/budget', label: m.nav_budget() },
		{ href: '/recurring', match: '/recurring', label: m.nav_recurring() },
		{ href: '/statistics', match: '/statistics', label: m.nav_statistics() }
	];

	$effect(() => {
		page.url.pathname;
		isMenuOpen = false;
	});
</script>

<nav class="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-2 py-2 backdrop-blur md:hidden">
	<div class="grid grid-cols-4 gap-2">
		{#each navItems as item}
			<a
				href={item.href}
				class="flex min-h-11 items-center justify-center rounded-md px-2 text-xs font-medium"
				class:bg-accent={page.url.pathname.startsWith(item.match)}
			>
				{item.label}
			</a>
		{/each}

		<Sheet bind:open={isMenuOpen}>
			<SheetTrigger class="flex min-h-11 items-center justify-center rounded-md px-2 text-xs font-medium hover:bg-accent">
				Menu
			</SheetTrigger>
			<SheetContent side="left" class="p-0">
				<Sidebar {user} {family} mobile />
			</SheetContent>
		</Sheet>
	</div>
</nav>
