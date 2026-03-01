# Design: Invited User Missing Budget Slot

**Date:** 2026-03-01  
**Status:** Approved

## Problem

When a user accepts a family invite and a `monthlyBudgets` row already exists for the current month, the new member has no `memberBudgets` row. The budget page renders nothing for them and they cannot add items.

### Root cause

`invite/[token]/+page.server.ts` — both `join` and `register` actions — only set `users.familyId`. They never create a `memberBudgets` row in any already-existing `monthlyBudgets`.

## Data model recap

```
Family → monthlyBudgets (1 per month) → memberBudgets (1 per member per month) → budgetItems
```

`createMonthFromScratch` correctly creates a `memberBudgets` row for every current family member, but it is only called when a new month is initialised — never retroactively.

## Design

### Shared helper — `src/lib/server/budget.ts`

Add `ensureMemberBudget(userId: string, monthlyBudgetId: string): void`.

- Performs an `INSERT OR IGNORE` (Drizzle `onConflictDoNothing`) of a `memberBudgets` row for `(monthlyBudgetId, userId)`.
- Idempotent — safe to call multiple times with no side effects.
- Does **not** pre-populate recurring templates (user starts with a blank slate for that month).

### Fix 1 — Invite-accept actions

**File:** `src/routes/invite/[token]/+page.server.ts`

After setting `user.familyId` in both the `join` action (line 55) and `register` action (line 88):

1. Query for the current calendar month's `monthlyBudgets` row by `familyId + currentYear + currentMonth`.
2. If a row exists, call `ensureMemberBudget(newUserId, monthlyBudget.id)`.

Cost: at most 1 SELECT + 1 INSERT per invite accept.

### Fix 2 — Budget page load safety net

**File:** `src/routes/(app)/budget/[year]/[month]/+page.server.ts`

After confirming the `monthlyBudgets` row exists (before returning data), call:

```ts
ensureMemberBudget(user.id, budget.id)
```

This is a no-op if the row already exists. Covers any existing affected users automatically on their first visit to any budget month.

## Data flow

```
User accepts invite
  → familyId set on users row
  → current monthlyBudgets row queried
  → ensureMemberBudget() inserts memberBudgets row (or does nothing)

User visits /budget/YEAR/MONTH
  → monthlyBudgets row fetched
  → ensureMemberBudget() called (no-op if already exists)
  → loadBudgetData() returns member's card
  → canEdit = true → user can add items
```

## Constraints

- No schema changes, no migrations required.
- No recurring templates pre-populated for mid-month joins.
- Past months are lazily fixed if the user navigates to them (Fix 2 handles it).
- Only current month is created at invite-accept time (Fix 1).
