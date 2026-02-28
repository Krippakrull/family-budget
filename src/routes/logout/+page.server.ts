import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { invalidateSession } from '$lib/server/auth';

export const actions: Actions = {
	default: async ({ cookies }) => {
		const token = cookies.get('session');
		if (token) {
			invalidateSession(token);
			cookies.delete('session', { path: '/' });
		}

		throw redirect(302, '/login');
	}
};
