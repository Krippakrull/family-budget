import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from './db';
import { sessions, users } from './db/schema';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const RENEWAL_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000;

export function generateSessionToken(): string {
	return crypto.randomBytes(32).toString('base64url');
}

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

export function createSession(userId: string): { token: string; expiresAt: Date } {
	const token = generateSessionToken();
	const now = new Date();
	const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

	db.insert(sessions)
		.values({
			id: token,
			userId,
			expiresAt,
			createdAt: now
		})
		.run();

	return { token, expiresAt };
}

export function validateSession(
	token: string
): { user: typeof users.$inferSelect; session: typeof sessions.$inferSelect } | null {
	const result = db
		.select()
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, token))
		.get();

	if (!result) return null;

	const { sessions: session, users: user } = result;

	if (session.expiresAt < new Date()) {
		db.delete(sessions).where(eq(sessions.id, token)).run();
		return null;
	}

	const timeRemaining = session.expiresAt.getTime() - Date.now();
	if (timeRemaining < RENEWAL_THRESHOLD_MS) {
		const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);
		db.update(sessions).set({ expiresAt: newExpiresAt }).where(eq(sessions.id, token)).run();
		session.expiresAt = newExpiresAt;
	}

	return { user, session };
}

export function invalidateSession(token: string): void {
	db.delete(sessions).where(eq(sessions.id, token)).run();
}

export function createUser(
	email: string,
	name: string,
	passwordHash: string,
	familyId?: string
): typeof users.$inferSelect {
	const id = ulid();
	const now = new Date();

	db.insert(users)
		.values({
			id,
			email: email.toLowerCase(),
			name,
			passwordHash,
			familyId: familyId ?? null,
			createdAt: now,
			updatedAt: now
		})
		.run();

	return db.select().from(users).where(eq(users.id, id)).get()!;
}
