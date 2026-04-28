# Recipe Manager — Senior Fullstack Engineer Interview

A pre-scaffolded repository for the interview exercise. **Start with `CANDIDATE.md`** for the task brief, requirements, and time guidance.

---

## Prerequisites

- [Node.js 20+](https://nodejs.org/) (check: `node --version`)
- [pnpm 9+](https://pnpm.io/installation) (check: `pnpm --version`)

## Quick Start

```bash
# Install dependencies (first run downloads mongodb-memory-server binary ~150 MB)
pnpm install

# Start the dev server (Next.js + embedded MongoDB)
pnpm dev
```

Then open **http://localhost:3000**.

> ⚠️ `pnpm install` requires an internet connection on the first run to download the MongoDB binary.
> Subsequent runs use the cached binary.

---

## Scripts

| Command           | Description                                         |
| ----------------- | --------------------------------------------------- |
| `pnpm dev`        | Start Next.js dev server with embedded MongoDB      |
| `pnpm build`      | Production build                                    |
| `pnpm start`      | Start production server (run `pnpm build` first)    |
| `pnpm typecheck`  | TypeScript type check (no emit)                     |
| `pnpm lint`       | Next.js lint                                        |
| `pnpm test`       | Run vitest test suite                               |
| `pnpm test:watch` | Run vitest in watch mode                            |
| `pnpm seed`       | Seed the database with 100 sample recipes           |
| `pnpm reset`      | Wipe database and re-seed with original 100 recipes |

---

## Project Layout

```
.
├── CANDIDATE.md          ← Start here: task brief
├── REFLECTION.md         ← Fill in before submitting
├── README.md             ← This file
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
├── scripts/
│   ├── seed.ts           ← Deterministic 100-recipe seed
│   └── reset.ts          ← Wipe + reseed
└── src/
    ├── app/
    │   ├── layout.tsx    ← Root layout (MUI + React Query providers)
    │   ├── page.tsx      ← Home page
    │   ├── providers.tsx ← Client providers
    │   ├── api/
    │   │   └── recipes/
    │   │       └── example/
    │   │           └── route.ts  ← Example API route
    │   └── recipes-example/
    │       └── page.tsx  ← Example page (read this before building yours)
    ├── lib/
    │   ├── db.ts         ← Mongoose + mongodb-memory-server singleton
    │   ├── mongo-memory.ts
    │   ├── query-client.ts
    │   ├── recipe-keys.ts
    │   └── schemas/
    │       └── recipe.ts ← Zod + Mongoose Recipe schema
    ├── test/
    │   └── setup.ts      ← Vitest hooks (in-memory Mongo)
    └── theme.ts          ← MUI theme
```

---

## Troubleshooting

**Port 3000 is already in use**

```bash
# Use a different port
PORT=3001 pnpm dev
```

**`pnpm install` fails to download MongoDB binary**

The binary download requires internet access. If you're offline or behind a proxy:

1. Try again with a direct connection
2. Or set `MONGOMS_SKIP_MD5_CHECK=true` and retry

**`pnpm` is not installed**

```bash
npm install -g pnpm
# or: corepack enable && corepack prepare pnpm@latest --activate
```

**TypeScript errors after install**

Run `pnpm install` again to ensure all `@types/*` packages are installed, then `pnpm typecheck`.

**Database in bad state**

```bash
pnpm reset   # wipes and re-seeds with original 100 recipes
```

---

## Deliverables

See `CANDIDATE.md` for the full task brief and submission instructions.

## Submission Note

When opening a PR from a fork, target the upstream repository `main` branch and ensure your source branch contains commits that differ from your fork's `main`.
