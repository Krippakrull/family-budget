import crypto from 'node:crypto';
import { fail } from '@sveltejs/kit';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { ulid } from 'ulid';
import type { Actions, PageServerLoad } from './$types';
import { sendInviteEmail } from '$lib/server/email';
import { db } from '$lib/server/db';
import { families, familyInvites, users } from '$lib/server/db/schema';

function createInviteToken(): string {
	return crypto.randomBytes(32).toString('base64url');
}

function createInviteExpiry(baseDate: Date): Date {
	return new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		return { family: null, members: [], pendingInvites: [] };
	}

	if (!user.familyId) {
		return { family: null, members: [], pendingInvites: [] };
	}

	const family = db.select().from(families).where(eq(families.id, user.familyId)).get() ?? null;
	const members = db
		.select({ id: users.id, name: users.name, email: users.email })
		.from(users)
		.where(eq(users.familyId, user.familyId))
		.all();
	const pendingInvites = db
		.select({ id: familyInvites.id, email: familyInvites.email, expiresAt: familyInvites.expiresAt })
		.from(familyInvites)
		.where(
			and(
				eq(familyInvites.familyId, user.familyId),
				isNull(familyInvites.usedAt),
				gt(familyInvites.expiresAt, new Date())
			)
		)
		.all();

	return { family, members, pendingInvites };
};

export const actions: Actions = {
	createFamily: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401);

		const data = await request.formData();
		const name = data.get('name')?.toString()?.trim();
		if (!name) return fail(400, { error: 'family_name_required' });

		if (user.familyId) return fail(400, { error: 'already_in_family' });

		const id = ulid();
		const now = new Date();

		db.insert(families).values({ id, name, createdAt: now, updatedAt: now }).run();
		db.update(users).set({ familyId: id, updatedAt: now }).where(eq(users.id, user.id)).run();

		return { success: true };
	},

	invite: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401);

		const data = await request.formData();
		const email = data.get('email')?.toString()?.toLowerCase();
		if (!email) return fail(400, { error: 'email_required' });
		if (!user.familyId) return fail(400, { error: 'no_family' });

		const family = db.select().from(families).where(eq(families.id, user.familyId)).get();
		if (!family) return fail(400, { error: 'no_family' });

		const now = new Date();
		const token = createInviteToken();
		const expiresAt = createInviteExpiry(now);

		db.insert(familyInvites)
			.values({
				id: ulid(),
				familyId: user.familyId,
				invitedBy: user.id,
				email,
				token,
				expiresAt,
				createdAt: now
			})
			.run();

		await sendInviteEmail(email, user.name, family.name, token, user.language);

		return { inviteSent: true };
	},

	resendInvite: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401);
		if (!user.familyId) return fail(400, { error: 'no_family' });

		const data = await request.formData();
		const inviteId = data.get('inviteId')?.toString();
		if (!inviteId) return fail(400, { error: 'invite_id_required' });

		const family = db.select().from(families).where(eq(families.id, user.familyId)).get();
		if (!family) return fail(400, { error: 'no_family' });

		const invite = db
			.select({ id: familyInvites.id, email: familyInvites.email, token: familyInvites.token })
			.from(familyInvites)
			.where(
				and(
					eq(familyInvites.id, inviteId),
					eq(familyInvites.familyId, user.familyId),
					isNull(familyInvites.usedAt),
					gt(familyInvites.expiresAt, new Date())
				)
			)
			.get();

		if (!invite) return fail(404, { error: 'invite_not_found' });

		const now = new Date();
		const expiresAt = createInviteExpiry(now);
		await sendInviteEmail(invite.email, user.name, family.name, invite.token, user.language);

		db.update(familyInvites).set({ expiresAt }).where(eq(familyInvites.id, invite.id)).run();

		return { inviteResent: true };
	},

	updateEqualizationMode: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401);

		const data = await request.formData();
		const mode = data.get('mode')?.toString();
		if (mode !== 'equal' && mode !== 'proportional') return fail(400, { error: 'invalid_mode' });
		if (!user.familyId) return fail(400, { error: 'no_family' });

		db.update(families)
			.set({ equalizationMode: mode, updatedAt: new Date() })
			.where(eq(families.id, user.familyId))
			.run();

		return { success: true };
	}
};
