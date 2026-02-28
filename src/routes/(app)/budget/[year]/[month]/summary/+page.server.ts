import { and, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { budgetItems, budgetItemTags, memberBudgets, monthlyBudgets, tags, users } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;
	if (!user?.familyId) {
		return { summary: null };
	}

	const year = Number.parseInt(params.year, 10);
	const month = Number.parseInt(params.month, 10);

	const budget = db
		.select()
		.from(monthlyBudgets)
		.where(
			and(eq(monthlyBudgets.familyId, user.familyId), eq(monthlyBudgets.year, year), eq(monthlyBudgets.month, month))
		)
		.get();

	if (!budget) return { summary: null, year, month };

	const memberBudgetRows = db
		.select()
		.from(memberBudgets)
		.innerJoin(users, eq(memberBudgets.userId, users.id))
		.where(eq(memberBudgets.monthlyBudgetId, budget.id))
		.all();

	let totalIncome = 0;
	let totalExpenses = 0;
	const byTag: Record<string, { income: number; expenses: number }> = {};
	const byMember: { name: string; income: number; expenses: number }[] = [];

	for (const row of memberBudgetRows) {
		const items = db.select().from(budgetItems).where(eq(budgetItems.memberBudgetId, row.member_budgets.id)).all();

		let memberIncome = 0;
		let memberExpenses = 0;

		for (const item of items) {
			if (item.type === 'income') {
				memberIncome += item.amount;
				totalIncome += item.amount;
			} else {
				memberExpenses += item.amount;
				totalExpenses += item.amount;
			}

			const itemTags = db
				.select({ name: tags.name })
				.from(budgetItemTags)
				.innerJoin(tags, eq(budgetItemTags.tagId, tags.id))
				.where(eq(budgetItemTags.budgetItemId, item.id))
				.all();

			for (const tag of itemTags) {
				if (!byTag[tag.name]) byTag[tag.name] = { income: 0, expenses: 0 };
				if (item.type === 'income') byTag[tag.name].income += item.amount;
				else byTag[tag.name].expenses += item.amount;
			}
		}

		byMember.push({ name: row.users.name, income: memberIncome, expenses: memberExpenses });
	}

	return {
		summary: { totalIncome, totalExpenses, byTag, byMember },
		year,
		month
	};
};
