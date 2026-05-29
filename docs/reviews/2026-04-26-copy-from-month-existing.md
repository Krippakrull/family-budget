# Code Review: copy-from-month-existing feature

**Date:** 2026-04-26  
**Files reviewed:**
- `src/lib/server/budget.ts` (`replaceFromMonth`)
- `src/routes/(app)/budget/[year]/[month]/+page.server.ts` (`copyFromMonthExisting` action, `load`)
- `src/routes/(app)/budget/[year]/[month]/+page.svelte`

---

## Bug 1 — Approved budget bypass (medium severity)

`copyFromMonthExisting` never checks if the current user's budget is already approved before replacing it. Every other mutation (`addItem`, `updateItem`, `deleteItem`) guards with `if (memberBudget.approved) return fail(400, ...)`. The `replaceFromMonth` call will silently un-approve an approved budget.

**Location:** `+page.server.ts`, `copyFromMonthExisting` action, after `loadBudgetData`.

**Fix:** Add the following before calling `replaceFromMonth`:
```ts
if (currentMember?.memberBudget.approved) return fail(400, { error: 'budget_approved' });
```

---

## Bug 2 — Missing `ensureMemberBudget` leading to unhandled 500 (low severity)

The action calls `getOrCreateMonthlyBudget` but not `ensureMemberBudget`. If the requesting user has no member budget row for the target month (e.g. direct POST without a prior page load, or a new family member hitting the action before their first load), `currentMember` is `undefined`, `hasItems` is `false`, and execution falls through to `replaceFromMonth`, which throws `'No budget found for this user in current month'` — an uncaught exception producing a 500 response.

**Location:** `+page.server.ts:144-145`

**Fix:** Add `ensureMemberBudget(user.id, targetBudget.id)` immediately after the `if (!targetBudget)` guard, consistent with what `load` does.

---

## Bug 3 — TypeScript strict-null error on `confirmSource` access (will fail `npm run check`)

`confirmSource` is typed `{ year: number; month: number } | null`. `validConfirm` is assigned from a complex `&&` chain that includes `confirmSource !== null`, but TypeScript's aliased-condition narrowing does not apply across chains that contain function calls (`hasSourceMonth`). With `strict: true` enabled, the access in the return object is an `Object is possibly 'null'` error.

**Location:** `+page.server.ts`, `load` function return:
```ts
sourceMonth: validConfirm ? `${confirmSource.year}-${confirmSource.month}` : undefined
```

**Fix:** Avoid the alias for this expression:
```ts
sourceMonth: validConfirm && confirmSource ? `${confirmSource.year}-${confirmSource.month}` : undefined
```

---

## Minor — `use:enhance` missing on the `copyFromMonthExisting` form

**Location:** `+page.svelte:176`

The initial-setup copy form uses `use:enhance`, but the `copyFromMonthExisting` form does not. Since the action always `throw redirect(...)`, it works correctly via full-page navigation either way, so this is an inconsistency rather than a breakage.
