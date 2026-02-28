import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const now = new Date();
	throw redirect(302, `/budget/${now.getFullYear()}/${now.getMonth() + 1}`);
};
