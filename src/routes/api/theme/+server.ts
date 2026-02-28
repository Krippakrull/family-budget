import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { accents, themes, type Accent, type Theme } from '$lib/theme';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const payload = (await request.json()) as { theme?: string; accentColor?: string };
	const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };

	if (payload.theme && themes.includes(payload.theme as (typeof themes)[number])) {
		updates.theme = payload.theme as Theme;
	}

	if (payload.accentColor && accents.includes(payload.accentColor as (typeof accents)[number])) {
		updates.accentColor = payload.accentColor as Accent;
	}

	db.update(users).set(updates).where(eq(users.id, locals.user.id)).run();

	return json({ ok: true });
};
