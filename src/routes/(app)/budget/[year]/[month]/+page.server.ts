import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import type { Actions, PageServerLoad } from './$types';
import { copyFromMonth, createMonthFromScratch, getOrCreateMonthlyBudget, loadBudgetData } from '$lib/server/budget';
import { db } from '$lib/server/db';
import {
	budgetItems,
	budgetItemTags,
	families,
	memberBudgets,
	monthlyBudgets,
	recurringTemplates,
	recurringTemplateTags,
	tags
} from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;
	if (!user?.familyId) {
		return { budget: null, needsFamily: true };
	}

	const year = Number.parseInt(params.year, 10);
	const month = Number.parseInt(params.month, 10);

	if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
		return { budget: null, invalidDate: true };
	}

	const budget = getOrCreateMonthlyBudget(user.familyId, year, month);
	if (!budget) {
		const availableMonths = db
			.select({ year: monthlyBudgets.year, month: monthlyBudgets.month })
			.from(monthlyBudgets)
			.where(eq(monthlyBudgets.familyId, user.familyId))
			.all();

		return { budget: null, needsSetup: true, availableMonths, year, month };
	}

	const data = loadBudgetData(budget.id);
	const familyTags = db.select().from(tags).where(eq(tags.familyId, user.familyId)).all();
	const family = db.select().from(families).where(eq(families.id, user.familyId)).get();

	return {
		...data,
		familyTags,
		equalizationMode: family?.equalizationMode ?? 'equal',
		year,
		month,
		currentUserId: user.id
	};
};

export const actions: Actions = {
	createFromScratch: async ({ params, locals }) => {
		const user = locals.user;
		if (!user?.familyId) return fail(400, { error: 'no_family' });

		createMonthFromScratch(user.familyId, Number.parseInt(params.year, 10), Number.parseInt(params.month, 10));
		return { created: true };
	},

	copyFromMonth: async ({ params, request, locals }) => {
		const user = locals.user;
		if (!user?.familyId) return fail(400, { error: 'no_family' });

		const data = await request.formData();
		const sourceYear = Number.parseInt(data.get('sourceYear')?.toString() ?? '', 10);
		const sourceMonth = Number.parseInt(data.get('sourceMonth')?.toString() ?? '', 10);
		if (Number.isNaN(sourceYear) || Number.isNaN(sourceMonth)) return fail(400, { error: 'invalid_source' });

		copyFromMonth(
			user.familyId,
			Number.parseInt(params.year, 10),
			Number.parseInt(params.month, 10),
			sourceYear,
			sourceMonth
		);

		return { created: true };
	},

	addItem: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401);

		const data = await request.formData();
		const memberBudgetId = data.get('memberBudgetId')?.toString();
		const name = data.get('name')?.toString()?.trim();
		const amount = Number.parseInt(data.get('amount')?.toString() ?? '', 10);
		const type = data.get('type')?.toString();

		if (!memberBudgetId || !name || Number.isNaN(amount) || (type !== 'income' && type !== 'expense')) {
			return fail(400, { error: 'invalid_item' });
		}

		const memberBudget = db.select().from(memberBudgets).where(eq(memberBudgets.id, memberBudgetId)).get();
		if (!memberBudget || memberBudget.userId !== user.id) return fail(403);
		if (memberBudget.approved) return fail(400, { error: 'budget_approved' });

		const now = new Date();
		db.insert(budgetItems)
			.values({
				id: ulid(),
				memberBudgetId,
				name,
				amount,
				type,
				createdAt: now,
				updatedAt: now
			})
			.run();

		return { success: true };
	},

	updateItem: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401);

		const data = await request.formData();
		const itemId = data.get('itemId')?.toString();
		const name = data.get('name')?.toString()?.trim();
		const amount = Number.parseInt(data.get('amount')?.toString() ?? '', 10);

		if (!itemId || !name || Number.isNaN(amount)) return fail(400, { error: 'invalid_item' });

		const item = db
			.select()
			.from(budgetItems)
			.innerJoin(memberBudgets, eq(budgetItems.memberBudgetId, memberBudgets.id))
			.where(eq(budgetItems.id, itemId))
			.get();

		if (!item || item.member_budgets.userId !== user.id) return fail(403);
		if (item.member_budgets.approved) return fail(400, { error: 'budget_approved' });

		db.update(budgetItems).set({ name, amount, updatedAt: new Date() }).where(eq(budgetItems.id, itemId)).run();
		return { success: true };
	},

	deleteItem: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401);

		const data = await request.formData();
		const itemId = data.get('itemId')?.toString();
		if (!itemId) return fail(400, { error: 'invalid_item' });

		const item = db
			.select()
			.from(budgetItems)
			.innerJoin(memberBudgets, eq(budgetItems.memberBudgetId, memberBudgets.id))
			.where(eq(budgetItems.id, itemId))
			.get();

		if (!item || item.member_budgets.userId !== user.id) return fail(403);
		if (item.member_budgets.approved) return fail(400, { error: 'budget_approved' });

		db.delete(budgetItems).where(eq(budgetItems.id, itemId)).run();
		return { success: true };
	},

	toggleApproval: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401);

		const data = await request.formData();
		const memberBudgetId = data.get('memberBudgetId')?.toString();
		if (!memberBudgetId) return fail(400, { error: 'missing_member_budget' });

		const memberBudget = db.select().from(memberBudgets).where(eq(memberBudgets.id, memberBudgetId)).get();
		if (!memberBudget || memberBudget.userId !== user.id) return fail(403);

		const nextApproved = !memberBudget.approved;
		db.update(memberBudgets)
			.set({ approved: nextApproved, approvedAt: nextApproved ? new Date() : null })
			.where(eq(memberBudgets.id, memberBudgetId))
			.run();

		return { success: true };
	},

	addTag: async ({ request, locals }) => {
		const user = locals.user;
		if (!user?.familyId) return fail(400, { error: 'no_family' });

		const data = await request.formData();
		const itemId = data.get('itemId')?.toString();
		const tagName = data.get('tagName')?.toString()?.trim()?.toLowerCase();
		if (!itemId || !tagName) return fail(400, { error: 'invalid_tag' });

		const item = db
			.select()
			.from(budgetItems)
			.innerJoin(memberBudgets, eq(budgetItems.memberBudgetId, memberBudgets.id))
			.where(eq(budgetItems.id, itemId))
			.get();
		if (!item || item.member_budgets.userId !== user.id) return fail(403);

		let tag = db.select().from(tags).where(and(eq(tags.familyId, user.familyId), eq(tags.name, tagName))).get();
		if (!tag) {
			const id = ulid();
			db.insert(tags).values({ id, familyId: user.familyId, name: tagName }).run();
			tag = { id, familyId: user.familyId, name: tagName };
		}

		try {
			db.insert(budgetItemTags).values({ budgetItemId: itemId, tagId: tag.id }).run();
		} catch {
			// ignore duplicates
		}

		return { success: true };
	},

	removeTag: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401);

		const data = await request.formData();
		const itemId = data.get('itemId')?.toString();
		const tagId = data.get('tagId')?.toString();
		if (!itemId || !tagId) return fail(400, { error: 'invalid_tag' });

		const item = db
			.select()
			.from(budgetItems)
			.innerJoin(memberBudgets, eq(budgetItems.memberBudgetId, memberBudgets.id))
			.where(eq(budgetItems.id, itemId))
			.get();
		if (!item || item.member_budgets.userId !== user.id) return fail(403);

		db.delete(budgetItemTags)
			.where(and(eq(budgetItemTags.budgetItemId, itemId), eq(budgetItemTags.tagId, tagId)))
			.run();

		return { success: true };
	},

	toggleRecurring: async ({ request, locals }) => {
		const user = locals.user;
		if (!user?.familyId) return fail(400, { error: 'no_family' });

		const data = await request.formData();
		const itemId = data.get('itemId')?.toString();
		if (!itemId) return fail(400, { error: 'invalid_item' });

		const item = db
			.select()
			.from(budgetItems)
			.innerJoin(memberBudgets, eq(budgetItems.memberBudgetId, memberBudgets.id))
			.where(eq(budgetItems.id, itemId))
			.get();
		if (!item || item.member_budgets.userId !== user.id) return fail(403);

		const isRecurring = !item.budget_items.isRecurring;
		db.update(budgetItems).set({ isRecurring, updatedAt: new Date() }).where(eq(budgetItems.id, itemId)).run();

		if (isRecurring) {
			const templateId = ulid();
			const now = new Date();
			db.insert(recurringTemplates)
				.values({
					id: templateId,
					userId: user.id,
					familyId: user.familyId,
					name: item.budget_items.name,
					amount: item.budget_items.amount,
					type: item.budget_items.type,
					createdAt: now,
					updatedAt: now
				})
				.run();

			const existingTags = db.select().from(budgetItemTags).where(eq(budgetItemTags.budgetItemId, itemId)).all();
			for (const row of existingTags) {
				db.insert(recurringTemplateTags)
					.values({ recurringTemplateId: templateId, tagId: row.tagId })
					.run();
			}
		} else {
			const templates = db
				.select()
				.from(recurringTemplates)
				.where(
					and(
						eq(recurringTemplates.userId, user.id),
						eq(recurringTemplates.familyId, user.familyId),
						eq(recurringTemplates.name, item.budget_items.name),
						eq(recurringTemplates.type, item.budget_items.type)
					)
				)
				.all();

			for (const template of templates) {
				db.delete(recurringTemplates).where(eq(recurringTemplates.id, template.id)).run();
			}
		}

		return { success: true };
	}
};
