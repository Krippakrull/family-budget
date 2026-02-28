import { integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const families = sqliteTable('families', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	equalizationMode: text('equalization_mode', { enum: ['equal', 'proportional'] })
		.notNull()
		.default('equal'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	passwordHash: text('password_hash').notNull(),
	language: text('language', { enum: ['sv', 'en'] }).notNull().default('sv'),
	theme: text('theme', { enum: ['light', 'dark'] }).notNull().default('light'),
	accentColor: text('accent_color').notNull().default('blue'),
	familyId: text('family_id').references(() => families.id),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const familyInvites = sqliteTable('family_invites', {
	id: text('id').primaryKey(),
	familyId: text('family_id')
		.notNull()
		.references(() => families.id, { onDelete: 'cascade' }),
	invitedBy: text('invited_by')
		.notNull()
		.references(() => users.id),
	email: text('email').notNull(),
	token: text('token').notNull().unique(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	usedAt: integer('used_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const monthlyBudgets = sqliteTable(
	'monthly_budgets',
	{
		id: text('id').primaryKey(),
		familyId: text('family_id')
			.notNull()
			.references(() => families.id, { onDelete: 'cascade' }),
		year: integer('year').notNull(),
		month: integer('month').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
	},
	(table) => [uniqueIndex('monthly_budgets_family_year_month').on(table.familyId, table.year, table.month)]
);

export const memberBudgets = sqliteTable(
	'member_budgets',
	{
		id: text('id').primaryKey(),
		monthlyBudgetId: text('monthly_budget_id')
			.notNull()
			.references(() => monthlyBudgets.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id),
		approved: integer('approved', { mode: 'boolean' }).notNull().default(false),
		approvedAt: integer('approved_at', { mode: 'timestamp' })
	},
	(table) => [uniqueIndex('member_budgets_monthly_user').on(table.monthlyBudgetId, table.userId)]
);

export const budgetItems = sqliteTable('budget_items', {
	id: text('id').primaryKey(),
	memberBudgetId: text('member_budget_id')
		.notNull()
		.references(() => memberBudgets.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	amount: integer('amount').notNull(),
	type: text('type', { enum: ['income', 'expense'] }).notNull(),
	isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(false),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const tags = sqliteTable(
	'tags',
	{
		id: text('id').primaryKey(),
		familyId: text('family_id')
			.notNull()
			.references(() => families.id, { onDelete: 'cascade' }),
		name: text('name').notNull()
	},
	(table) => [uniqueIndex('tags_family_name').on(table.familyId, table.name)]
);

export const budgetItemTags = sqliteTable(
	'budget_item_tags',
	{
		budgetItemId: text('budget_item_id')
			.notNull()
			.references(() => budgetItems.id, { onDelete: 'cascade' }),
		tagId: text('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' })
	},
	(table) => [primaryKey({ columns: [table.budgetItemId, table.tagId] })]
);

export const recurringTemplates = sqliteTable('recurring_templates', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	familyId: text('family_id')
		.notNull()
		.references(() => families.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	amount: integer('amount').notNull(),
	type: text('type', { enum: ['income', 'expense'] }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const recurringTemplateTags = sqliteTable(
	'recurring_template_tags',
	{
		recurringTemplateId: text('recurring_template_id')
			.notNull()
			.references(() => recurringTemplates.id, { onDelete: 'cascade' }),
		tagId: text('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' })
	},
	(table) => [primaryKey({ columns: [table.recurringTemplateId, table.tagId] })]
);

export const reminderLogs = sqliteTable(
	'reminder_logs',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id),
		familyId: text('family_id')
			.notNull()
			.references(() => families.id),
		year: integer('year').notNull(),
		month: integer('month').notNull(),
		sentAt: integer('sent_at', { mode: 'timestamp' }).notNull()
	},
	(table) => [uniqueIndex('reminder_logs_user_year_month').on(table.userId, table.year, table.month)]
);
