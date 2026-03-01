# Invited User Missing Budget Slot — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure that when a user joins a family (via invite), they automatically get a `memberBudgets` row for the current month's budget (if one exists), and lazily get one for any month they navigate to.

**Architecture:** Add an idempotent `ensureMemberBudget` helper to `budget.ts` that does an INSERT-or-ignore. Call it in both invite-accept actions (at join time) and in the budget page load function (safety net for existing affected users).

**Tech Stack:** SvelteKit 2, Drizzle ORM, SQLite (better-sqlite3), TypeScript, ULID

---

### Task 1: Add `ensureMemberBudget` helper to `budget.ts`

**Files:**
- Modify: `src/lib/server/budget.ts` (after line 23, before `createMonthFromScratch`)

**Step 1: Add the import for `onConflictDoNothing`**

Drizzle's `.onConflictDoNothing()` is already available on insert statements without extra imports. `ulid` is already imported. No new imports needed.

**Step 2: Add the helper function**

After the closing brace of `getOrCreateMonthlyBudget` (line 23), insert:

```typescript
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
```

The `memberBudgets` table has a unique index on `(monthlyBudgetId, userId)` (schema.ts line 79), so `onConflictDoNothing()` makes this idempotent — safe to call any number of times.

**Step 3: Verify TypeScript is happy**

Run: `npm run check`
Expected: No new errors.

**Step 4: Commit**

```bash
git add src/lib/server/budget.ts
git commit -m "feat: add ensureMemberBudget idempotent helper"
```

---

### Task 2: Call helper in invite-accept `join` action

**Files:**
- Modify: `src/routes/invite/[token]/+page.server.ts`

**Step 1: Add import for `ensureMemberBudget` and `getOrCreateMonthlyBudget`**

The file already imports from `$lib/server/db` and `$lib/server/auth`. Add the budget helpers import. Current imports do NOT include anything from `$lib/server/budget`. Add:

```typescript
import { ensureMemberBudget, getOrCreateMonthlyBudget } from '$lib/server/budget';
```

Place it after the existing imports (after line 7).

**Step 2: Update the `join` action**

Current code at lines 54–58:
```typescript
const now = new Date();
db.update(users).set({ familyId: invite.familyId, updatedAt: now }).where(eq(users.id, user.id)).run();
db.update(familyInvites).set({ usedAt: now }).where(eq(familyInvites.id, invite.id)).run();

throw redirect(302, '/');
```

Replace with:
```typescript
const now = new Date();
db.update(users).set({ familyId: invite.familyId, updatedAt: now }).where(eq(users.id, user.id)).run();
db.update(familyInvites).set({ usedAt: now }).where(eq(familyInvites.id, invite.id)).run();

const currentDate = new Date();
const currentBudget = getOrCreateMonthlyBudget(
    invite.familyId,
    currentDate.getFullYear(),
    currentDate.getMonth() + 1
);
if (currentBudget) {
    ensureMemberBudget(user.id, currentBudget.id);
}

throw redirect(302, '/');
```

Note: `getMonth()` returns 0-based months, so `+ 1` is required.

**Step 3: Verify TypeScript is happy**

Run: `npm run check`
Expected: No new errors.

**Step 4: Commit**

```bash
git add src/routes/invite/\[token\]/+page.server.ts
git commit -m "fix: create memberBudgets row for joining user in current month"
```

---

### Task 3: Call helper in invite-accept `register` action

**Files:**
- Modify: `src/routes/invite/[token]/+page.server.ts` (same file as Task 2)

The import added in Task 2 already covers this.

**Step 1: Update the `register` action**

Current code at lines 87–103:
```typescript
const passwordHash = await hashPassword(password);
const user = createUser(email, name, passwordHash, invite.familyId);

const now = new Date();
db.update(familyInvites).set({ usedAt: now }).where(eq(familyInvites.id, invite.id)).run();

const { token, expiresAt } = createSession(user.id);
// ... cookie setup ...
throw redirect(302, '/');
```

After the `db.update(familyInvites)` line and before `createSession`, insert:

```typescript
const currentDate = new Date();
const currentBudget = getOrCreateMonthlyBudget(
    invite.familyId,
    currentDate.getFullYear(),
    currentDate.getMonth() + 1
);
if (currentBudget) {
    ensureMemberBudget(user.id, currentBudget.id);
}
```

**Step 2: Verify TypeScript is happy**

Run: `npm run check`
Expected: No new errors.

**Step 3: Commit**

```bash
git add src/routes/invite/\[token\]/+page.server.ts
git commit -m "fix: create memberBudgets row for newly registered invited user in current month"
```

---

### Task 4: Add safety-net lazy creation in budget page load

This handles existing users who are already in a broken state (joined before this fix).

**Files:**
- Modify: `src/routes/(app)/budget/[year]/[month]/+page.server.ts`

**Step 1: Add `ensureMemberBudget` to the import from `$lib/server/budget`**

Current import at line 7:
```typescript
import { copyFromMonth, createMonthFromScratch, getOrCreateMonthlyBudget, loadBudgetData } from '$lib/server/budget';
```

Replace with:
```typescript
import { copyFromMonth, createMonthFromScratch, ensureMemberBudget, getOrCreateMonthlyBudget, loadBudgetData } from '$lib/server/budget';
```

**Step 2: Add the safety-net call in the `load` function**

Current code at lines 36–47:
```typescript
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
```

Replace with:
```typescript
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
```

**Step 3: Verify TypeScript is happy**

Run: `npm run check`
Expected: No new errors.

**Step 4: Commit**

```bash
git add "src/routes/(app)/budget/[year]/[month]/+page.server.ts"
git commit -m "fix: lazily create memberBudgets row for family member missing a budget slot"
```

---

### Task 5: Manual end-to-end verification

Since there is no automated test suite, verify manually:

1. Start the dev server: `npm run dev`
2. Create a family with User A. Create the budget for the current month.
3. Invite User B via the family settings page.
4. Accept the invite as User B (both the "join existing account" and "register new account" flows should be tested).
5. Navigate to the budget page for the current month as User B.
6. **Expected:** User B's budget card is visible and the "add item" form is present.
7. Add an income and an expense item. **Expected:** Items are saved successfully.
8. Also test: navigate to a *past* month as User B. **Expected:** User B's card appears (lazy creation) with no items.

---

### Summary of changes

| File | Change |
|---|---|
| `src/lib/server/budget.ts` | Add `ensureMemberBudget(userId, monthlyBudgetId)` helper |
| `src/routes/invite/[token]/+page.server.ts` | Call helper in `join` and `register` actions after setting `familyId` |
| `src/routes/(app)/budget/[year]/[month]/+page.server.ts` | Call helper in `load` after confirming budget exists |
