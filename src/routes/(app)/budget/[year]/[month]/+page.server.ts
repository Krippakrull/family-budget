import { env } from '$env/dynamic/private';
import { fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import type { Actions, PageServerLoad } from './$types';
import { parseCurrencyInput } from '$lib/currency.js';
import { copyFromMonth, createMonthFromScratch, ensureMemberBudget, getOrCreateMonthlyBudget, loadBudgetData, replaceFromMonth } from '$lib/server/budget';
import { db } from '$lib/server/db';
import { sendApprovalSummaryEmail } from '$lib/server/email';
import {
	approvalSummaryLogs,
	budgetItems,
	budgetItemTags,
	families,
	memberBudgets,
	monthlyBudgets,
	recurringTemplates,
	recurringTemplateTags,
	tags,
	users
} from '$lib/server/db/schema';

function parseSourceMonth(value: FormDataEntryValue | string | null): { year: number; month: number } | null {
	const rawValue = value?.toString() ?? '';
	const match = /^(\d{4})-(\d{1,2})$/.exec(rawValue);
	if (!match) return null;

	const year = Number.parseInt(match[1], 10);
	const month = Number.parseInt(match[2], 10);
	if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) return null;

	return { year, month };
}

function hasSourceMonth(familyId: string, year: number, month: number): boolean {
	const source = db
		.select({ id: monthlyBudgets.id })
		.from(monthlyBudgets)
		.where(and(eq(monthlyBudgets.familyId, familyId), eq(monthlyBudgets.year, year), eq(monthlyBudgets.month, month)))
		.get();

	return source !== undefined;
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const user = locals.user;
	if (!user?.familyId) {
		return { budget: null, needsFamily: true };
	}

	const year = Number.parseInt(params.year, 10);
	const month = Number.parseInt(params.month, 10);

	if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
		return { budget: null, invalidDate: true };
	}

	const needsConfirm = url.searchParams.has('copyConfirm');
	const confirmSource = parseSourceMonth(url.searchParams.get('sourceMonth'));

	const budget = getOrCreateMonthlyBudget(user.familyId, year, month);
	if (!budget) {
		const availableMonths = db
			.select({ year: monthlyBudgets.year, month: monthlyBudgets.month })
			.from(monthlyBudgets)
			.where(eq(monthlyBudgets.familyId, user.familyId))
			.all();

		return { budget: null, needsSetup: true, availableMonths, year, month };
	}

	ensureMemberBudget(user.id, budget.id);
	const data = loadBudgetData(budget.id);
	const familyTags = db.select().from(tags).where(eq(tags.familyId, user.familyId)).all();
	const family = db.select().from(families).where(eq(families.id, user.familyId)).get();
	const availableMonths = db
		.select({ year: monthlyBudgets.year, month: monthlyBudgets.month })
		.from(monthlyBudgets)
		.where(eq(monthlyBudgets.familyId, user.familyId))
		.all();
	const copyAvailableMonths = availableMonths.filter((option) => option.year !== year || option.month !== month);

	const validConfirm =
		needsConfirm &&
		confirmSource !== null &&
		(confirmSource.year !== year || confirmSource.month !== month) &&
		hasSourceMonth(user.familyId, confirmSource.year, confirmSource.month);

	return {
		...data,
		familyTags,
		availableMonths,
		copyAvailableMonths,
		equalizationMode: family?.equalizationMode ?? 'equal',
		year,
		month,
		currentUserId: user.id,
		currentLanguage: user.language,
		needsConfirm: validConfirm || undefined,
		sourceMonth: validConfirm && confirmSource ? `${confirmSource.year}-${confirmSource.month}` : undefined
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
		const source = parseSourceMonth(data.get('sourceMonth'));
		if (!source || !hasSourceMonth(user.familyId, source.year, source.month)) return fail(400, { error: 'invalid_source' });

		copyFromMonth(
			user.familyId,
			Number.parseInt(params.year, 10),
			Number.parseInt(params.month, 10),
			source.year,
			source.month
		);

		return { created: true };
	},

	copyFromMonthExisting: async ({ params, request, locals, url }) => {
		const user = locals.user;
		if (!user?.familyId) return fail(400, { error: 'no_family' });

		const formData = await request.formData();
		const source = parseSourceMonth(formData.get('sourceMonth'));
		if (!source || !hasSourceMonth(user.familyId, source.year, source.month)) return fail(400, { error: 'invalid_source' });

		const targetYear = Number.parseInt(params.year, 10);
		const targetMonth = Number.parseInt(params.month, 10);
		if (source.year === targetYear && source.month === targetMonth) return fail(400, { error: 'invalid_source' });

		const targetBudget = getOrCreateMonthlyBudget(user.familyId, targetYear, targetMonth);
		if (!targetBudget) return fail(400, { error: 'no_budget' });

		const sourceBudget = getOrCreateMonthlyBudget(user.familyId, source.year, source.month);
		if (!sourceBudget) return fail(400, { error: 'invalid_source' });

		const sourceMemberBudget = db
			.select()
			.from(memberBudgets)
			.where(and(eq(memberBudgets.monthlyBudgetId, sourceBudget.id), eq(memberBudgets.userId, user.id)))
			.get();

		if (!sourceMemberBudget) {
			return fail(400, { error: 'no_source_data' });
		}

		ensureMemberBudget(user.id, targetBudget.id);
		const budgetData = loadBudgetData(targetBudget.id);
		const currentMember = budgetData.members.find((m) => m.user.id === user.id);
		if (currentMember?.memberBudget.approved) return fail(400, { error: 'budget_approved' });

		const hasItems = currentMember !== undefined && currentMember.items.length > 0;
		const confirmed = formData.get('confirmed') === 'yes';

		if (hasItems && !confirmed) {
			const dest = new URL(url);
			dest.search = `?copyConfirm&sourceMonth=${source.year}-${source.month}`;
			throw redirect(302, dest.pathname + dest.search);
		}

		replaceFromMonth(targetBudget.id, source.year, source.month, user.familyId, user.id);

		const dest = new URL(url);
		dest.search = '';
		throw redirect(302, dest.pathname);
	},

	addItem: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401);

		const data = await request.formData();
		const memberBudgetId = data.get('memberBudgetId')?.toString();
		const name = data.get('name')?.toString()?.trim();
		const amount = parseCurrencyInput(data.get('amount')?.toString() ?? '', user.language);
		const type = data.get('type')?.toString();

		if (!memberBudgetId || !name || amount === null || (type !== 'income' && type !== 'expense')) {
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
		const amount = parseCurrencyInput(data.get('amount')?.toString() ?? '', user.language);

		if (!itemId || !name || amount === null) return fail(400, { error: 'invalid_item' });

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

		if (nextApproved && user.familyId) {
			const monthlyBudget = db
				.select({
					id: monthlyBudgets.id,
					familyId: monthlyBudgets.familyId,
					year: monthlyBudgets.year,
					month: monthlyBudgets.month
				})
				.from(monthlyBudgets)
				.where(eq(monthlyBudgets.id, memberBudget.monthlyBudgetId))
				.get();

			if (monthlyBudget && monthlyBudget.familyId === user.familyId) {
				const family = db
					.select({ id: families.id, name: families.name, sendApprovalSummary: families.sendApprovalSummary })
					.from(families)
					.where(eq(families.id, monthlyBudget.familyId))
					.get();

				if (family?.sendApprovalSummary) {
					const familyMembers = db
						.select({ id: users.id, email: users.email, name: users.name, language: users.language })
						.from(users)
						.where(eq(users.familyId, monthlyBudget.familyId))
						.all();

					if (familyMembers.length > 1) {
						const alreadySent = db
							.select({ id: approvalSummaryLogs.id })
							.from(approvalSummaryLogs)
							.where(
								and(
									eq(approvalSummaryLogs.familyId, monthlyBudget.familyId),
									eq(approvalSummaryLogs.year, monthlyBudget.year),
									eq(approvalSummaryLogs.month, monthlyBudget.month)
								)
							)
							.get();

						if (!alreadySent) {
							const approvals = db
								.select({ approved: memberBudgets.approved })
								.from(memberBudgets)
								.where(eq(memberBudgets.monthlyBudgetId, monthlyBudget.id))
								.all();

							const allApproved = approvals.length > 0 && approvals.every((row) => row.approved);

							if (allApproved) {
								const itemRows = db
									.select({ amount: budgetItems.amount, type: budgetItems.type })
									.from(budgetItems)
									.innerJoin(memberBudgets, eq(budgetItems.memberBudgetId, memberBudgets.id))
									.where(eq(memberBudgets.monthlyBudgetId, monthlyBudget.id))
									.all();

								let totalIncome = 0;
								let totalExpenses = 0;
								for (const row of itemRows) {
									if (row.type === 'income') totalIncome += row.amount;
									else totalExpenses += row.amount;
								}

								const baseUrl = env.BASE_URL || 'http://localhost:5173';
								const summaryUrl = `${baseUrl}/budget/${monthlyBudget.year}/${monthlyBudget.month}/summary`;

								let allEmailsSent = true;
								for (const member of familyMembers) {
									try {
										await sendApprovalSummaryEmail(
											member.email,
											member.name,
											family.name,
											monthlyBudget.month,
											monthlyBudget.year,
											totalIncome,
											totalExpenses,
											summaryUrl,
											member.language as 'sv' | 'en'
										);
									} catch (error) {
										allEmailsSent = false;
										console.error(`Failed to send approval summary to ${member.email}:`, error);
									}
								}

								if (allEmailsSent) {
									db.insert(approvalSummaryLogs)
										.values({
											id: ulid(),
											familyId: monthlyBudget.familyId,
											year: monthlyBudget.year,
											month: monthlyBudget.month,
											sentAt: new Date()
										})
										.run();
								}
							}
						}
					}
				}
			}
		}

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
