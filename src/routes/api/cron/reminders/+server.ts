import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import type { RequestHandler } from './$types';
import { sendReminderEmail } from '$lib/server/email';
import { db } from '$lib/server/db';
import { families, memberBudgets, monthlyBudgets, reminderLogs, users } from '$lib/server/db/schema';

const monthNames = {
	sv: ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'],
	en: [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	]
} as const;

export const GET: RequestHandler = async ({ url }) => {
	const key = url.searchParams.get('key');
	if (!key || key !== env.CRON_SECRET) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const now = new Date();

	let nextMonth = now.getMonth() + 2;
	let nextYear = now.getFullYear();
	if (nextMonth > 12) {
		nextMonth = 1;
		nextYear += 1;
	}

	const allFamilies = db.select().from(families).all();
	let sent = 0;

	for (const family of allFamilies) {
		if (now.getDate() < family.reminderDay) {
			continue;
		}

		const members = db.select().from(users).where(eq(users.familyId, family.id)).all();

		const budget = db
			.select()
			.from(monthlyBudgets)
			.where(
				and(
					eq(monthlyBudgets.familyId, family.id),
					eq(monthlyBudgets.year, nextYear),
					eq(monthlyBudgets.month, nextMonth)
				)
			)
			.get();

		for (const member of members) {
			const alreadySent = db
				.select()
				.from(reminderLogs)
				.where(
					and(
						eq(reminderLogs.userId, member.id),
						eq(reminderLogs.year, nextYear),
						eq(reminderLogs.month, nextMonth)
					)
				)
				.get();

			if (alreadySent) continue;

			let approved = false;
			if (budget) {
				const memberBudget = db
					.select()
					.from(memberBudgets)
					.where(and(eq(memberBudgets.monthlyBudgetId, budget.id), eq(memberBudgets.userId, member.id)))
					.get();

				if (memberBudget?.approved) approved = true;
			}

			if (!approved) {
				const language = member.language as 'sv' | 'en';
				const monthName = monthNames[language][nextMonth - 1];
				const budgetUrl = `${env.BASE_URL}/budget/${nextYear}/${nextMonth}`;

				try {
					await sendReminderEmail(member.email, member.name, monthName, nextYear, budgetUrl, language);

					db.insert(reminderLogs)
						.values({
							id: ulid(),
							userId: member.id,
							familyId: family.id,
							year: nextYear,
							month: nextMonth,
							sentAt: now
						})
						.run();

					sent += 1;
				} catch (error) {
					console.error(`Failed to send reminder to ${member.email}:`, error);
				}
			}
		}
	}

	return json({ message: 'Reminders processed', sent });
};
