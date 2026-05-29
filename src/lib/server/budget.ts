import { and, eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from './db';
import {
	budgetItems,
	budgetItemTags,
	memberBudgets,
	monthlyBudgets,
	recurringTemplates,
	recurringTemplateTags,
	tags,
	users
} from './db/schema';

export function getOrCreateMonthlyBudget(familyId: string, year: number, month: number) {
	const budget = db
		.select()
		.from(monthlyBudgets)
		.where(and(eq(monthlyBudgets.familyId, familyId), eq(monthlyBudgets.year, year), eq(monthlyBudgets.month, month)))
		.get();

	return budget ?? null;
}

export function ensureMemberBudget(userId: string, monthlyBudgetId: string): void {
	db.insert(memberBudgets)
		.values({
			id: ulid(),
			monthlyBudgetId,
			userId
		})
		.onConflictDoNothing()
		.run();
}

export function createMonthFromScratch(familyId: string, year: number, month: number): string {
	return db.transaction((tx) => {
		const existing = tx
			.select()
			.from(monthlyBudgets)
			.where(
				and(
					eq(monthlyBudgets.familyId, familyId),
					eq(monthlyBudgets.year, year),
					eq(monthlyBudgets.month, month)
				)
			)
			.get();

		if (existing) {
			return existing.id;
		}

		const now = new Date();
		const budgetId = ulid();

		tx.insert(monthlyBudgets).values({
			id: budgetId,
			familyId,
			year,
			month,
			createdAt: now
		}).run();

		const members = tx.select().from(users).where(eq(users.familyId, familyId)).all();

		for (const member of members) {
			const memberBudgetId = ulid();
			tx.insert(memberBudgets).values({
				id: memberBudgetId,
				monthlyBudgetId: budgetId,
				userId: member.id
			}).run();

			const templates = tx
				.select()
				.from(recurringTemplates)
				.where(and(eq(recurringTemplates.userId, member.id), eq(recurringTemplates.familyId, familyId)))
				.all();

			for (const template of templates) {
				const itemId = ulid();
				tx.insert(budgetItems).values({
					id: itemId,
					memberBudgetId,
					name: template.name,
					amount: template.amount,
					type: template.type,
					isRecurring: true,
					sortOrder: 0,
					createdAt: now,
					updatedAt: now
				}).run();

				const templateTags = tx
					.select()
					.from(recurringTemplateTags)
					.where(eq(recurringTemplateTags.recurringTemplateId, template.id))
					.all();

				for (const templateTag of templateTags) {
					tx.insert(budgetItemTags).values({ budgetItemId: itemId, tagId: templateTag.tagId }).run();
				}
			}
		}

		return budgetId;
	}, { behavior: 'immediate' });
}

export function copyFromMonth(
	familyId: string,
	targetYear: number,
	targetMonth: number,
	sourceYear: number,
	sourceMonth: number
): string {
	return db.transaction((tx) => {
		const existing = tx
			.select()
			.from(monthlyBudgets)
			.where(
				and(
					eq(monthlyBudgets.familyId, familyId),
					eq(monthlyBudgets.year, targetYear),
					eq(monthlyBudgets.month, targetMonth)
				)
			)
			.get();

		if (existing) {
			return existing.id;
		}

		const source = tx
			.select()
			.from(monthlyBudgets)
			.where(
				and(
					eq(monthlyBudgets.familyId, familyId),
					eq(monthlyBudgets.year, sourceYear),
					eq(monthlyBudgets.month, sourceMonth)
				)
			)
			.get();

		if (!source) {
			throw new Error('Source month not found');
		}

		const now = new Date();
		const targetBudgetId = ulid();

		tx.insert(monthlyBudgets).values({
			id: targetBudgetId,
			familyId,
			year: targetYear,
			month: targetMonth,
			createdAt: now
		}).run();

		// Fetch all current family members
		const currentMembers = tx.select().from(users).where(eq(users.familyId, familyId)).all();

		for (const member of currentMembers) {
			const newMemberBudgetId = ulid();
			tx.insert(memberBudgets).values({
				id: newMemberBudgetId,
				monthlyBudgetId: targetBudgetId,
				userId: member.id
			}).run();

			// Look up if this member had a budget in the source month
			const sourceMemberBudget = tx
				.select()
				.from(memberBudgets)
				.where(and(eq(memberBudgets.monthlyBudgetId, source.id), eq(memberBudgets.userId, member.id)))
				.get();

			if (sourceMemberBudget) {
				const sourceItems = tx.select().from(budgetItems).where(eq(budgetItems.memberBudgetId, sourceMemberBudget.id)).all();
				for (const item of sourceItems) {
					const newItemId = ulid();
					tx.insert(budgetItems).values({
						id: newItemId,
						memberBudgetId: newMemberBudgetId,
						name: item.name,
						amount: item.amount,
						type: item.type,
						isRecurring: item.isRecurring,
						sortOrder: item.sortOrder,
						createdAt: now,
						updatedAt: now
					}).run();

					const sourceItemTags = tx
						.select()
						.from(budgetItemTags)
						.where(eq(budgetItemTags.budgetItemId, item.id))
						.all();

					for (const sourceItemTag of sourceItemTags) {
						tx.insert(budgetItemTags).values({ budgetItemId: newItemId, tagId: sourceItemTag.tagId }).run();
					}
				}
			} else {
				// Member is new or didn't have budget last month: populate recurring templates
				const templates = tx
					.select()
					.from(recurringTemplates)
					.where(and(eq(recurringTemplates.userId, member.id), eq(recurringTemplates.familyId, familyId)))
					.all();

				for (const template of templates) {
					const itemId = ulid();
					tx.insert(budgetItems).values({
						id: itemId,
						memberBudgetId: newMemberBudgetId,
						name: template.name,
						amount: template.amount,
						type: template.type,
						isRecurring: true,
						sortOrder: 0,
						createdAt: now,
						updatedAt: now
					}).run();

					const templateTags = tx
						.select()
						.from(recurringTemplateTags)
						.where(eq(recurringTemplateTags.recurringTemplateId, template.id))
						.all();

					for (const templateTag of templateTags) {
						tx.insert(budgetItemTags).values({ budgetItemId: itemId, tagId: templateTag.tagId }).run();
					}
				}
			}
		}

		return targetBudgetId;
	}, { behavior: 'immediate' });
}

export function replaceFromMonth(
	targetBudgetId: string,
	sourceYear: number,
	sourceMonth: number,
	familyId: string,
	userId: string
): void {
	const source = db
		.select()
		.from(monthlyBudgets)
		.where(
			and(
				eq(monthlyBudgets.familyId, familyId),
				eq(monthlyBudgets.year, sourceYear),
				eq(monthlyBudgets.month, sourceMonth)
			)
		)
		.get();

	if (!source) {
		throw new Error('Source month not found');
	}

	const sourceMemberBudget = db
		.select()
		.from(memberBudgets)
		.where(and(eq(memberBudgets.monthlyBudgetId, source.id), eq(memberBudgets.userId, userId)))
		.get();

	if (!sourceMemberBudget) {
		throw new Error('No budget data for this user in source month');
	}

	const targetMemberBudget = db
		.select()
		.from(memberBudgets)
		.where(and(eq(memberBudgets.monthlyBudgetId, targetBudgetId), eq(memberBudgets.userId, userId)))
		.get();

	if (!targetMemberBudget) {
		throw new Error('No budget found for this user in current month');
	}

	const sourceItems = db
		.select()
		.from(budgetItems)
		.where(eq(budgetItems.memberBudgetId, sourceMemberBudget.id))
		.all();

	const sourceTagsByItem = new Map(
		sourceItems.map((item) => [
			item.id,
			db.select().from(budgetItemTags).where(eq(budgetItemTags.budgetItemId, item.id)).all()
		])
	);

	db.transaction((tx) => {
		const targetItems = tx.select().from(budgetItems).where(eq(budgetItems.memberBudgetId, targetMemberBudget.id)).all();
		for (const item of targetItems) {
			tx.delete(budgetItemTags).where(eq(budgetItemTags.budgetItemId, item.id)).run();
			tx.delete(budgetItems).where(eq(budgetItems.id, item.id)).run();
		}

		const now = new Date();
		for (const item of sourceItems) {
			const newItemId = ulid();
			tx.insert(budgetItems)
				.values({
					id: newItemId,
					memberBudgetId: targetMemberBudget.id,
					name: item.name,
					amount: item.amount,
					type: item.type,
					isRecurring: item.isRecurring,
					sortOrder: item.sortOrder,
					createdAt: now,
					updatedAt: now
				})
				.run();

			for (const sourceItemTag of sourceTagsByItem.get(item.id) ?? []) {
				tx.insert(budgetItemTags).values({ budgetItemId: newItemId, tagId: sourceItemTag.tagId }).run();
			}
		}

		tx.update(memberBudgets)
			.set({ approved: false, approvedAt: null })
			.where(eq(memberBudgets.id, targetMemberBudget.id))
			.run();
	});
}

export function loadBudgetData(budgetId: string) {
	const budget = db.select().from(monthlyBudgets).where(eq(monthlyBudgets.id, budgetId)).get();
	if (!budget) {
		throw new Error('Budget not found');
	}

	const memberBudgetRows = db
		.select()
		.from(memberBudgets)
		.innerJoin(users, eq(memberBudgets.userId, users.id))
		.where(eq(memberBudgets.monthlyBudgetId, budgetId))
		.all();

	const members = memberBudgetRows.map((row) => {
		const items = db.select().from(budgetItems).where(eq(budgetItems.memberBudgetId, row.member_budgets.id)).all();

		const itemsWithTags = items.map((item) => {
			const itemTags = db
				.select({ id: tags.id, name: tags.name })
				.from(budgetItemTags)
				.innerJoin(tags, eq(budgetItemTags.tagId, tags.id))
				.where(eq(budgetItemTags.budgetItemId, item.id))
				.all();

			return { ...item, tags: itemTags };
		});

		return {
			memberBudget: row.member_budgets,
			user: { id: row.users.id, name: row.users.name },
			items: itemsWithTags
		};
	});

	return { budget, members };
}
