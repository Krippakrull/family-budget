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
	const now = new Date();
	const budgetId = ulid();

	db.insert(monthlyBudgets).values({
		id: budgetId,
		familyId,
		year,
		month,
		createdAt: now
	}).run();

	const members = db.select().from(users).where(eq(users.familyId, familyId)).all();

	for (const member of members) {
		const memberBudgetId = ulid();
		db.insert(memberBudgets).values({
			id: memberBudgetId,
			monthlyBudgetId: budgetId,
			userId: member.id
		}).run();

		const templates = db
			.select()
			.from(recurringTemplates)
			.where(and(eq(recurringTemplates.userId, member.id), eq(recurringTemplates.familyId, familyId)))
			.all();

		for (const template of templates) {
			const itemId = ulid();
			db.insert(budgetItems).values({
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

			const templateTags = db
				.select()
				.from(recurringTemplateTags)
				.where(eq(recurringTemplateTags.recurringTemplateId, template.id))
				.all();

			for (const templateTag of templateTags) {
				db.insert(budgetItemTags).values({ budgetItemId: itemId, tagId: templateTag.tagId }).run();
			}
		}
	}

	return budgetId;
}

export function copyFromMonth(
	familyId: string,
	targetYear: number,
	targetMonth: number,
	sourceYear: number,
	sourceMonth: number
): string {
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

	const now = new Date();
	const targetBudgetId = ulid();

	db.insert(monthlyBudgets).values({
		id: targetBudgetId,
		familyId,
		year: targetYear,
		month: targetMonth,
		createdAt: now
	}).run();

	const sourceMemberBudgets = db.select().from(memberBudgets).where(eq(memberBudgets.monthlyBudgetId, source.id)).all();

	for (const sourceMemberBudget of sourceMemberBudgets) {
		const newMemberBudgetId = ulid();
		db.insert(memberBudgets).values({
			id: newMemberBudgetId,
			monthlyBudgetId: targetBudgetId,
			userId: sourceMemberBudget.userId
		}).run();

		const sourceItems = db.select().from(budgetItems).where(eq(budgetItems.memberBudgetId, sourceMemberBudget.id)).all();
		for (const item of sourceItems) {
			const newItemId = ulid();
			db.insert(budgetItems).values({
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

			const sourceItemTags = db
				.select()
				.from(budgetItemTags)
				.where(eq(budgetItemTags.budgetItemId, item.id))
				.all();

			for (const sourceItemTag of sourceItemTags) {
				db.insert(budgetItemTags).values({ budgetItemId: newItemId, tagId: sourceItemTag.tagId }).run();
			}
		}
	}

	return targetBudgetId;
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
