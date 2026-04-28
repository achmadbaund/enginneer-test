# Reflection

## 1. Architectural Decisions

**Decision 1: Shared Zod schema at the API boundary and in the client form**

_Context:_

The brief requires business rules on both client and server. Duplicating rules in two places risks drift.

_Options considered:_

- Validate only on the server and show generic errors on the client.
- Validate only on the client (faster UX but insecure).
- One Zod schema (`CreateRecipeBusinessSchema` + `parseRecipePayload`) used in `RecipeForm` and in `POST`/`PATCH` handlers.

_Decision and trade-offs:_

I centralized rules in `src/lib/recipe-validation.ts` and call `parseRecipePayload` from the form before submit and from API routes on every write. Title **uniqueness** cannot be expressed purely in Zod against the DB, so it is enforced separately via `findRecipeByNormalizedTitle` after Zod succeeds.

_Trade-off:_ slightly more coupling between UI and validation module, but a single source of truth for lengths, totals, tags regex, ingredient dedupe, etc.

_With more time I'd:_

Extract a tiny `validationErrorsToUI()` helper shared by form and API error payloads, add more targeted tests for API routes (409 duplicate title), and consider `z.superRefine` async for optional client-side uniqueness preview (still keeping server check).

---

**Decision 2: REST route handlers under `/api/recipes` plus React Query keys from `recipeKeys`**

_Context:_

The scaffold uses `/api/recipes/example` with `recipeKeys.list({})` and mutations; the brief expects browse/search/filter/CRUD.

_Options considered:_

- Next.js Server Actions only (no REST).
- Mirror the example pattern with explicit `fetch('/api/recipes')` routes.

_Decision and trade-offs:_

I followed the example: list/detail/mutations use `@tanstack/react-query` with keys from `src/lib/recipe-keys.ts` (`list`, `detail`, `tagOptions`) so invalidation stays consistent (`invalidateQueries` on lists after mutations).

_Trade-off:_ more boilerplate than Server Actions, but aligns with `recipes-example`, is easy to test by hitting routes, and keeps Mongoose logic in one layer.

_With more time I'd:_

Add optimistic updates for deletes, prefetch detail on list hover, and stabilize list cache keys when filters reorder (e.g. sorted tags array for the query key).

---

**Decision 3: MongoDB query shape for filters and search**

_Context:_

List view needs keyword search plus multi-tag and difficulty filters.

_Options considered:_

- Tags filter with `$in` (match any selected tag) vs `$all` (recipe must contain every selected tag).
- Regex search vs full-text index (not set up in the in-memory scaffold).

_Decision and trade-offs:_

I used `$all` for tags so multiple selections narrow results (AND semantics). Search uses case-insensitive `RegExp` across `title`, `description`, `tags`, `ingredients.name`, and `steps`, with escaping via `escapeRegex` for user input.

_Trade-off:_ regex on several fields can be slower at very large scale; acceptable for this exercise and the seeded dataset size.

_With more time I'd:_

Switch to Atlas Search or MongoDB text index if this were production; expose OR semantics for tags behind a UX toggle if product wanted “any tag” behaviour.

---

## 2. Bugs Found in the Scaffold

- **`src/app/api/recipes/example/route.ts` (`POST`)** — The example intentionally accepts arbitrary JSON and passes it straight to `RecipeModel.create(body)` without schema or business-rule validation. That is acceptable for a demo of wiring only; for production-style code it would be unsafe. **Fix:** Not changed (out of scope / example left as-is); the production feature uses `/api/recipes` with `parseRecipePayload`.

- **`next build` warnings** — Optional transitive dependency warnings (e.g. optional `aws4`) can appear via `mongodb-memory-server` → `mongodb`. **Fix:** No dependency-level change was required; runtime behavior remained stable after the `next.config.ts` bundling fix below.

---

## 3. AI Tool Usage

| Tool | Task(s) | Representative prompt | What you kept | What you changed or rejected |
| ---- | ------- | --------------------- | ------------- | ---------------------------- |
| Cursor (AI coding agent) | Implement Recipe Manager pages, API routes, Zod business validation, duplicate-title check, Vitest tests for validation + `RecipeForm`, wire home link | Paraphrased: build list/detail/create/edit/delete with search/filters; enforce business rules on client and server; tests for Zod + one component test | Overall architecture (shared Zod, REST + React Query, `recipeKeys`), route layout, core UI flows | Avoided adding `@mui/icons-material` (used text buttons instead); adjusted API error shape to issue paths for forms; refined tests (e.g. mock `next/navigation`) |

---

## 4. What I'd Improve Given More Time

1. **API route integration tests** (supertest or calling handlers with mocked `NextRequest`) for `POST` duplicate title → 409, validation → 400 with issue paths.
2. **E2E tests** (Playwright) for happy paths: create recipe → appear in list → edit → delete with confirmation.
3. **URL-synced filters** so search/tag/difficulty/page are shareable and back-button friendly; optional backend cursor pagination for very large datasets.
4. **Accessibility pass** on `Autocomplete`, dialog focus trap, and live regions for mutation errors.

---

## 5. Ambiguities I Encountered and How I Resolved Them

- **What was unclear:** Whether selecting multiple tags in the filter should mean “match **any** tag” or “match **all** tags.”
- **Decision I made:** **All** selected tags must be present (`$all` in MongoDB).
- **Reasoning:** Multi-select filters in many UIs narrow results as you add constraints; matches “filter by tags” as refinement.

- **What was unclear:** Minimum number of steps (only per-step length and max count were specified).
- **Decision I made:** Require **at least one** non-empty step after trim.
- **Reasoning:** A recipe with zero steps is not usable; the spec implies an ordered procedure exists.

- **What was unclear:** Exact scope of “search across recipe content.”
- **Decision I made:** Search applies to title, description, tags, ingredient names, and step text.
- **Reasoning:** Covers how users look up recipes by ingredient name or remembered phrase in instructions.

---

## 6. Changes I Made to Scaffold Config

- **File changed:** `next.config.ts`
- **What changed:** `transpilePackages` includes `@mui/material-nextjs` (and does not list `@mui/icons-material`, which is not a dependency). **`serverExternalPackages`** lists `mongoose`, `mongodb`, and `mongodb-memory-server` so they are not Webpack-bundled into flaky vendor chunks (fixes dev/prod failures such as `Cannot find module './vendor-chunks/mongodb@*.js'` on API routes including `GET /api/recipes/[id]`). Compiler / ESLint / `tsconfig` unchanged.
- **Reason:** MUI App Router integration requires transpiling `@mui/material-nextjs`. Mongoose/MongoDB must stay as Node externals per Next.js guidance; bundling them breaks dynamic route handlers that import `connectDB`.

**No new npm dependencies.** **No changes** to `tsconfig.json` or ESLint config.
