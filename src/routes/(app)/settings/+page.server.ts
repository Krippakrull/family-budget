import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { accents, themes, type Accent, type Theme } from '$lib/theme';
import { hashPassword, verifyPassword } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		return { user: null };
	}

	return {
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			language: user.language,
			theme: user.theme,
			accentColor: user.accentColor
		}
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401);

		const data = await request.formData();
		const name = data.get('name')?.toString()?.trim();
		const language = data.get('language')?.toString();

		if (!name) return fail(400, { error: 'name_required' });
		if (language !== 'sv' && language !== 'en') return fail(400, { error: 'invalid_language' });

		db.update(users).set({ name, language, updatedAt: new Date() }).where(eq(users.id, user.id)).run();

		return { profileUpdated: true };
	},

	updateTheme: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401);

		const data = await request.formData();
		const theme = data.get('theme')?.toString();
		const accentColor = data.get('accentColor')?.toString();

		const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
		if (theme && themes.includes(theme as (typeof themes)[number])) updates.theme = theme as Theme;
		if (accentColor && accents.includes(accentColor as (typeof accents)[number])) {
			updates.accentColor = accentColor as Accent;
		}

		db.update(users).set(updates).where(eq(users.id, user.id)).run();

		return { themeUpdated: true };
	},

	changePassword: async ({ request, locals }) => {
		const sessionUser = locals.user;
		if (!sessionUser) return fail(401);

		const data = await request.formData();
		const currentPassword = data.get('currentPassword')?.toString();
		const newPassword = data.get('newPassword')?.toString();

		if (!currentPassword || !newPassword) return fail(400, { error: 'all_fields_required' });
		if (newPassword.length < 8) return fail(400, { error: 'password_too_short' });

		const user = db.select().from(users).where(eq(users.id, sessionUser.id)).get();
		if (!user) return fail(404, { error: 'user_not_found' });

		const valid = await verifyPassword(currentPassword, user.passwordHash);
		if (!valid) return fail(400, { error: 'invalid_current_password' });

		const passwordHash = await hashPassword(newPassword);
		db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id)).run();

		return { passwordChanged: true };
	}
};
