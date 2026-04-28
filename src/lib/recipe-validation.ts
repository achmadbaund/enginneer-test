import { z } from 'zod';

const TAG_REGEX = /^[a-z0-9-]+$/;

export const IngredientBusinessSchema = z.object({
  name: z.string(),
  qty: z.number().positive(),
  unit: z.string(),
});

export type TIngredientBusiness = z.infer<typeof IngredientBusinessSchema>;

/**
 * Full client + server validation for create/update payloads.
 * Title uniqueness vs existing documents is enforced separately in API routes (DB).
 */
export const CreateRecipeBusinessSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    servings: z.number().int().positive(),
    prepMin: z.number().int().nonnegative(),
    cookMin: z.number().int().nonnegative(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    tags: z.array(z.string()),
    ingredients: z.array(IngredientBusinessSchema),
    steps: z.array(z.string()),
  })
  .transform((data) => ({
    ...data,
    title: data.title.trim(),
    description: data.description.trim(),
    tags: data.tags.map((t) => t.trim()).filter(Boolean),
    ingredients: data.ingredients.map((ing) => ({
      name: ing.name.trim(),
      qty: ing.qty,
      unit: ing.unit.trim(),
    })),
    steps: data.steps.map((s) => s.trim()).filter((s) => s.length > 0),
  }))
  .superRefine((data, ctx) => {
    if (!data.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Title is required.',
        path: ['title'],
      });
    }

    if (!data.description) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Description is required.',
        path: ['description'],
      });
    }

    const total = data.prepMin + data.cookMin;
    if (total <= 0 || total > 1440) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Total time (prep + cook) must be between 1 and 1440 minutes.',
        path: ['prepMin'],
      });
    }

    if (data.ingredients.length < 1 || data.ingredients.length > 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must have between 1 and 50 ingredients.',
        path: ['ingredients'],
      });
    }

    data.ingredients.forEach((ing, i) => {
      if (!ing.name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ingredient name is required.',
          path: ['ingredients', i, 'name'],
        });
      }
      if (!ing.unit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Unit is required.',
          path: ['ingredients', i, 'unit'],
        });
      }
    });

    const seenNames = new Set<string>();
    data.ingredients.forEach((ing, i) => {
      const key = ing.name.toLowerCase();
      if (!ing.name) return;
      if (seenNames.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate ingredient name (case-insensitive).',
          path: ['ingredients', i, 'name'],
        });
      }
      seenNames.add(key);
    });

    if (data.tags.length > 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Maximum 5 tags.',
        path: ['tags'],
      });
    }
    data.tags.forEach((tag, i) => {
      if (tag.length < 2 || tag.length > 20 || !TAG_REGEX.test(tag)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Each tag must be 2–20 characters and match ^[a-z0-9-]+$ (lowercase letters, digits, hyphen).',
          path: ['tags', i],
        });
      }
    });

    if (data.steps.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one step is required.',
        path: ['steps'],
      });
    }

    if (data.steps.length > 30) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Maximum 30 steps.',
        path: ['steps'],
      });
    }
    data.steps.forEach((step, i) => {
      if (step.length < 5 || step.length > 500) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Each step must be 5–500 characters.',
          path: ['steps', i],
        });
      }
    });
  });

export type TRecipePayload = z.output<typeof CreateRecipeBusinessSchema>;

export function parseRecipePayload(input: unknown) {
  return CreateRecipeBusinessSchema.safeParse(input);
}

/** Map Zod issues to dot-path keys for inline field errors (e.g. ingredients.0.name). */
export function zodIssuesToRecord(issues: z.ZodIssue[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.length ? issue.path.join('.') : '_form';
    if (!map[key]) map[key] = issue.message;
  }
  return map;
}
