import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { createSession, createUser, hashPassword } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, '/');
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString()?.toLowerCase();
		const name = data.get('name')?.toString()?.trim();
		const password = data.get('password')?.toString();
		const confirmPassword = data.get('confirmPassword')?.toString();

		if (!email || !name || !password || !confirmPassword) {
			return fail(400, { error: 'all_fields_required', email, name });
		}

		if (password.length < 8) {
			return fail(400, { error: 'password_too_short', email, name });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'passwords_dont_match', email, name });
		}

		const existing = db.select().from(users).where(eq(users.email, email)).get();
		if (existing) {
			return fail(400, { error: 'email_already_registered', email, name });
		}

		const passwordHash = await hashPassword(password);
		const user = createUser(email, name, passwordHash);

		const { token, expiresAt } = createSession(user.id);

		cookies.set('session', token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: false,
			expires: expiresAt
		});

		throw redirect(302, '/');
	}
};
