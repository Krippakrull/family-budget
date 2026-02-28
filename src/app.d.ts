import type { sessions, users } from '$lib/server/db/schema';

declare global {
	namespace App {
		interface Locals {
			user: typeof users.$inferSelect | null;
			session: typeof sessions.$inferSelect | null;
		}
	}
}

export {};
