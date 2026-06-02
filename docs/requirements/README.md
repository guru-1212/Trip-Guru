# TripMate — Requirements for AI Agents

**Read this folder before implementing user prompts.** User messages may be incomplete, ambiguous, or refer to the wrong product (Trips vs Rooms). These files are the source of truth for **intended behavior**.

## Start here

| Order | File | When to read |
|-------|------|----------------|
| 1 | [00-agent-checklist.md](./00-agent-checklist.md) | **Every task** — quick gates before coding |
| 2 | [01-product-scope.md](./01-product-scope.md) | Any feature touching trips, rooms, or dashboard |
| 3 | [GEMINI.md](../../GEMINI.md) | Architecture, paths, tech stack (repo root) |

## Roommates module (Rooms)

| File | Topic |
|------|--------|
| [02-room-expenses.md](./02-room-expenses.md) | Add/edit/delete expenses, who can change what |
| [03-room-settlements.md](./03-room-settlements.md) | Pay → confirm workflow, statuses, overview dues |
| [04-room-audit-history.md](./04-room-audit-history.md) | Activity log, cycle history |
| [05-room-ui-navigation.md](./05-room-ui-navigation.md) | Back links, overview stats (paid by, pending dues) |
| [06-firestore-and-security.md](./06-firestore-and-security.md) | Collections, rules, indexes |
| [07-room-bring-list.md](./07-room-bring-list.md) | Things to bring checklist |
| [08-push-notifications.md](./08-push-notifications.md) | FCM push when app is closed |

## Trips module

| File | Topic |
|------|--------|
| [09-trip-packing-checklist.md](./09-trip-packing-checklist.md) | Packing checklist, templates, buy/bring, progress |

## If the user prompt conflicts with these docs

1. **Prefer these requirements** over a casual user phrase (e.g. “delete any expense” → still only `createdBy`).
2. **Ask one clarifying question** only when the doc is silent and both interpretations change data model or security.
3. **Do not** “fix” trip code while doing room work (or vice versa) unless the task explicitly spans both.

## Updating these docs

When product behavior changes, update the matching `docs/requirements/*.md` in the **same PR/commit** as the code. Stale docs cause agent regressions.
