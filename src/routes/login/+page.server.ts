import { dev } from '$app/environment';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { createSession, verifyPassword } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, '/');
	}
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString()?.toLowerCase();
		const password = data.get('password')?.toString();

		if (!email || !password) {
			return fail(400, { error: 'email_and_password_required', email });
		}

		const user = db.select().from(users).where(eq(users.email, email)).get();

		if (!user) {
			return fail(400, { error: 'invalid_credentials', email });
		}

		const valid = await verifyPassword(password, user.passwordHash);
		if (!valid) {
			return fail(400, { error: 'invalid_credentials', email });
		}

		const { token, expiresAt } = createSession(user.id);
		const secureCookie = !dev && (url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https');

		cookies.set('session', token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: secureCookie,
			expires: expiresAt
		});

		throw redirect(302, '/');
	}
};
