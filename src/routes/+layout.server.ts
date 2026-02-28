import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user
			? {
					id: locals.user.id,
					name: locals.user.name,
					email: locals.user.email,
					language: locals.user.language,
					theme: locals.user.theme,
					accentColor: locals.user.accentColor,
					familyId: locals.user.familyId
				}
			: null
	};
};
