export const themes = ['light', 'dark'] as const;
export const accents = ['blue', 'green', 'purple', 'amber'] as const;

export type Theme = (typeof themes)[number];
export type Accent = (typeof accents)[number];

export function applyTheme(theme: Theme, accent: Accent): void {
	const root = document.documentElement;
	root.setAttribute('data-theme', theme);
	root.setAttribute('data-accent', accent);
	root.classList.toggle('dark', theme === 'dark');
}
