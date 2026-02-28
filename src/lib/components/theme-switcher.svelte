<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as m from '$lib/paraglide/messages.js';
	import { accents, applyTheme, type Accent, type Theme } from '$lib/theme';

	type ThemeUser = {
		theme: 'light' | 'dark';
		accentColor: string;
	} | null;

	let { user } = $props<{ user: ThemeUser }>();
	const initialTheme = user?.theme ?? 'light';
	const initialAccent = accents.includes(user?.accentColor as Accent)
		? (user?.accentColor as Accent)
		: 'blue';

	let theme = $state<Theme>(initialTheme);
	let accent = $state<Accent>(initialAccent);

	const accentClasses: Record<Accent, string> = {
		blue: 'bg-blue-500',
		green: 'bg-green-500',
		purple: 'bg-purple-500',
		amber: 'bg-amber-500'
	};

	$effect(() => {
		applyTheme(theme, accent);
	});

	async function persist(nextTheme: Theme, nextAccent: Accent): Promise<void> {
		theme = nextTheme;
		accent = nextAccent;
		applyTheme(theme, accent);

		await fetch('/api/theme', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ theme, accentColor: accent })
		});
	}
</script>

<div class="space-y-2 rounded-md border p-3">
	<p class="text-xs font-medium text-muted-foreground">{m.theme()}</p>
	<div class="grid grid-cols-2 gap-2">
		<Button
			type="button"
			variant={theme === 'light' ? 'default' : 'outline'}
			size="sm"
			onclick={() => persist('light', accent)}
		>
			{m.light()}
		</Button>
		<Button
			type="button"
			variant={theme === 'dark' ? 'default' : 'outline'}
			size="sm"
			onclick={() => persist('dark', accent)}
		>
			{m.dark()}
		</Button>
	</div>

	<p class="text-xs font-medium text-muted-foreground">{m.accent_color()}</p>
	<div class="grid grid-cols-4 gap-2">
		{#each accents as accentOption}
			<Button
				type="button"
				variant="outline"
				size="icon"
				onclick={() => persist(theme, accentOption)}
				class={accent === accentOption ? 'border-primary' : ''}
			>
				<span class={`size-4 rounded-full ${accentClasses[accentOption]}`}></span>
			</Button>
		{/each}
	</div>
</div>
