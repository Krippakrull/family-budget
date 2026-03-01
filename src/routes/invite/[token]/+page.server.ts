import { dev } from '$app/environment';
import { fail, redirect } from '@sveltejs/kit';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { createSession, createUser, hashPassword } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { families, familyInvites, users } from '$lib/server/db/schema';
import { ensureMemberBudget, getOrCreateMonthlyBudget } from '$lib/server/budget';

export const load: PageServerLoad = async ({ params, locals }) => {
	const invite = db
		.select()
		.from(familyInvites)
		.innerJoin(families, eq(familyInvites.familyId, families.id))
		.where(
			and(
				eq(familyInvites.token, params.token),
				isNull(familyInvites.usedAt),
				gt(familyInvites.expiresAt, new Date())
			)
		)
		.get();

	if (!invite) {
		return { valid: false, invite: null, family: null, isLoggedIn: false };
	}

	return {
		valid: true,
		invite: { email: invite.family_invites.email },
		family: { name: invite.families.name },
		isLoggedIn: !!locals.user
	};
};

export const actions: Actions = {
	join: async ({ params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401);

		const invite = db
			.select()
			.from(familyInvites)
			.where(
				and(
					eq(familyInvites.token, params.token),
					isNull(familyInvites.usedAt),
					gt(familyInvites.expiresAt, new Date())
				)
			)
			.get();

		if (!invite) return fail(400, { error: 'invalid_invite' });

		const now = new Date();
		db.update(users).set({ familyId: invite.familyId, updatedAt: now }).where(eq(users.id, user.id)).run();
		db.update(familyInvites).set({ usedAt: now }).where(eq(familyInvites.id, invite.id)).run();

		const currentDate = new Date();
		const currentBudget = getOrCreateMonthlyBudget(
			invite.familyId,
			currentDate.getFullYear(),
			currentDate.getMonth() + 1
		);
		if (currentBudget) {
			ensureMemberBudget(user.id, currentBudget.id);
		}

		throw redirect(302, '/');
	},

	register: async ({ params, request, cookies, url }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString()?.toLowerCase();
		const name = data.get('name')?.toString()?.trim();
		const password = data.get('password')?.toString();

		if (!email || !name || !password) return fail(400, { error: 'all_fields_required' });
		if (password.length < 8) return fail(400, { error: 'password_too_short' });

		const invite = db
			.select()
			.from(familyInvites)
			.where(
				and(
					eq(familyInvites.token, params.token),
					isNull(familyInvites.usedAt),
					gt(familyInvites.expiresAt, new Date())
				)
			)
			.get();

		if (!invite) return fail(400, { error: 'invalid_invite' });

		const existing = db.select().from(users).where(eq(users.email, email)).get();
		if (existing) return fail(400, { error: 'email_already_registered' });

		const passwordHash = await hashPassword(password);
		const user = createUser(email, name, passwordHash, invite.familyId);

		const now = new Date();
		db.update(familyInvites).set({ usedAt: now }).where(eq(familyInvites.id, invite.id)).run();

		const currentDate = new Date();
		const currentBudget = getOrCreateMonthlyBudget(
			invite.familyId,
			currentDate.getFullYear(),
			currentDate.getMonth() + 1
		);
		if (currentBudget) {
			ensureMemberBudget(user.id, currentBudget.id);
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
