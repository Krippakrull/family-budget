import { createI18n } from '@inlang/paraglide-sveltekit';
import * as runtime from '$lib/paraglide/runtime';

export const i18n = createI18n(runtime as any, {
	defaultLanguageTag: 'sv',
	prefixDefaultLanguage: 'never'
});
