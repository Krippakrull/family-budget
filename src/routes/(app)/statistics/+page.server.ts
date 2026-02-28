import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { budgetItems, budgetItemTags, memberBudgets, monthlyBudgets, tags, users } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ url, locals }) => {
	const user = locals.user;
	if (!user?.familyId) {
		return { stats: null, months: 12 };
	}

	const months = Number.parseInt(url.searchParams.get('months') ?? '12', 10);
	const safeMonths = Number.isNaN(months) ? 12 : Math.max(1, Math.min(36, months));

	const now = new Date();
	const endYear = now.getFullYear();
	const endMonth = now.getMonth() + 1;

	let startMonth = endMonth - safeMonths + 1;
	let startYear = endYear;
	while (startMonth <= 0) {
		startMonth += 12;
		startYear -= 1;
	}

	const budgets = db
		.select()
		.from(monthlyBudgets)
		.where(eq(monthlyBudgets.familyId, user.familyId))
		.all()
		.filter((budget) => {
			const budgetDate = budget.year * 12 + budget.month;
			const startDate = startYear * 12 + startMonth;
			const endDate = endYear * 12 + endMonth;
			return budgetDate >= startDate && budgetDate <= endDate;
		})
		.sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));

	const monthlyData = budgets.map((budget) => {
		const memberRows = db
			.select()
			.from(memberBudgets)
			.innerJoin(users, eq(memberBudgets.userId, users.id))
			.where(eq(memberBudgets.monthlyBudgetId, budget.id))
			.all();

		let totalIncome = 0;
		let totalExpenses = 0;
		const tagTotals: Record<string, number> = {};
		const memberData: { name: string; income: number; expenses: number }[] = [];

		for (const row of memberRows) {
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

					const itemTags = db
						.select({ name: tags.name })
						.from(budgetItemTags)
						.innerJoin(tags, eq(budgetItemTags.tagId, tags.id))
						.where(eq(budgetItemTags.budgetItemId, item.id))
						.all();

					for (const tag of itemTags) {
						tagTotals[tag.name] = (tagTotals[tag.name] ?? 0) + item.amount;
					}
				}
			}

			memberData.push({ name: row.users.name, income: memberIncome, expenses: memberExpenses });
		}

		return {
			year: budget.year,
			month: budget.month,
			totalIncome,
			totalExpenses,
			savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0,
			tagTotals,
			memberData
		};
	});

	return { stats: monthlyData, months: safeMonths };
};
