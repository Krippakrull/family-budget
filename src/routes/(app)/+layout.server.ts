import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { families, users } from '$lib/server/db/schema';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	let family: typeof families.$inferSelect | null = null;
	let familyMembers: { id: string; name: string; email: string }[] = [];

	if (locals.user.familyId) {
		family = db.select().from(families).where(eq(families.id, locals.user.familyId)).get() ?? null;
		familyMembers = db
			.select({ id: users.id, name: users.name, email: users.email })
			.from(users)
			.where(eq(users.familyId, locals.user.familyId))
			.all();
	}

	return { family, familyMembers };
};
