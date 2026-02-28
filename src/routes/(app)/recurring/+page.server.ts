import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import type { Actions, PageServerLoad } from './$types';
import { parseCurrencyInput } from '$lib/currency.js';
import { db } from '$lib/server/db';
import { recurringTemplates, recurringTemplateTags, tags } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user?.familyId) {
		return { templates: [], familyTags: [], currentLanguage: 'sv' };
	}

	const templates = db.select().from(recurringTemplates).where(eq(recurringTemplates.userId, user.id)).all();

	const templatesWithTags = templates.map((template) => {
		const templateTags = db
			.select({ id: tags.id, name: tags.name })
			.from(recurringTemplateTags)
			.innerJoin(tags, eq(recurringTemplateTags.tagId, tags.id))
			.where(eq(recurringTemplateTags.recurringTemplateId, template.id))
			.all();

		return { ...template, tags: templateTags };
	});

	const familyTags = db.select().from(tags).where(eq(tags.familyId, user.familyId)).all();

	return { templates: templatesWithTags, familyTags, currentLanguage: user.language };
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const user = locals.user;
		if (!user?.familyId) return fail(400, { error: 'no_family' });

		const data = await request.formData();
		const name = data.get('name')?.toString()?.trim();
		const amount = parseCurrencyInput(data.get('amount')?.toString() ?? '', user.language);
		const type = data.get('type')?.toString();

		if (!name || amount === null || (type !== 'income' && type !== 'expense')) {
			return fail(400, { error: 'invalid_template' });
		}

		const now = new Date();
		db.insert(recurringTemplates)
			.values({ id: ulid(), userId: user.id, familyId: user.familyId, name, amount, type, createdAt: now, updatedAt: now })
			.run();

		return { success: true };
	},

	update: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401);

		const data = await request.formData();
		const id = data.get('id')?.toString();
		const name = data.get('name')?.toString()?.trim();
		const amount = parseCurrencyInput(data.get('amount')?.toString() ?? '', user.language);

		if (!id || !name || amount === null) return fail(400, { error: 'invalid_template' });

		const template = db.select().from(recurringTemplates).where(eq(recurringTemplates.id, id)).get();
		if (!template || template.userId !== user.id) return fail(403);

		db.update(recurringTemplates).set({ name, amount, updatedAt: new Date() }).where(eq(recurringTemplates.id, id)).run();
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401);

		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'invalid_template' });

		const template = db.select().from(recurringTemplates).where(eq(recurringTemplates.id, id)).get();
		if (!template || template.userId !== user.id) return fail(403);

		db.delete(recurringTemplates).where(eq(recurringTemplates.id, id)).run();
		return { success: true };
	},

	addTag: async ({ request, locals }) => {
		const user = locals.user;
		if (!user?.familyId) return fail(400, { error: 'no_family' });

		const data = await request.formData();
		const templateId = data.get('templateId')?.toString();
		const tagName = data.get('tagName')?.toString()?.trim()?.toLowerCase();
		if (!templateId || !tagName) return fail(400, { error: 'invalid_tag' });

		const template = db.select().from(recurringTemplates).where(eq(recurringTemplates.id, templateId)).get();
		if (!template || template.userId !== user.id) return fail(403);

		let tag = db.select().from(tags).where(and(eq(tags.familyId, user.familyId), eq(tags.name, tagName))).get();
		if (!tag) {
			const id = ulid();
			db.insert(tags).values({ id, familyId: user.familyId, name: tagName }).run();
			tag = { id, familyId: user.familyId, name: tagName };
		}

		try {
			db.insert(recurringTemplateTags).values({ recurringTemplateId: templateId, tagId: tag.id }).run();
		} catch {
			// ignore duplicates
		}

		return { success: true };
	},

	removeTag: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401);

		const data = await request.formData();
		const templateId = data.get('templateId')?.toString();
		const tagId = data.get('tagId')?.toString();
		if (!templateId || !tagId) return fail(400, { error: 'invalid_tag' });

		const template = db.select().from(recurringTemplates).where(eq(recurringTemplates.id, templateId)).get();
		if (!template || template.userId !== user.id) return fail(403);

		db.delete(recurringTemplateTags)
			.where(and(eq(recurringTemplateTags.recurringTemplateId, templateId), eq(recurringTemplateTags.tagId, tagId)))
			.run();

		return { success: true };
	}
};
