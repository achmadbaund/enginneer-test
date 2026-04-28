import { describe, test, expect } from 'vitest';
import { parseRecipePayload, zodIssuesToRecord } from './recipe-validation';

const base = {
  title: '  My Recipe  ',
  description: 'A good meal.',
  servings: 2,
  prepMin: 5,
  cookMin: 10,
  difficulty: 'medium' as const,
  tags: ['quick', 'vegan'],
  ingredients: [
    { name: 'Salt', qty: 1, unit: 'g' },
    { name: 'Pepper', qty: 2, unit: 'g' },
  ],
  steps: [
    'First, prepare the ingredients and tools for this recipe.',
    'Then cook until done and serve while still hot and fresh.',
  ],
};

describe('CreateRecipeBusinessSchema / parseRecipePayload', () => {
  test('accepts a valid payload and normalizes title', () => {
    const r = parseRecipePayload(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.title).toBe('My Recipe');
    }
  });

  test('rejects when total time is 0', () => {
    const r = parseRecipePayload({ ...base, prepMin: 0, cookMin: 0 });
    expect(r.success).toBe(false);
  });

  test('rejects when total time exceeds 1440', () => {
    const r = parseRecipePayload({ ...base, prepMin: 2000, cookMin: 0 });
    expect(r.success).toBe(false);
  });

  test('rejects duplicate ingredients (case-insensitive)', () => {
    const r = parseRecipePayload({
      ...base,
      ingredients: [
        { name: 'Onion', qty: 1, unit: 'g' },
        { name: 'onion', qty: 2, unit: 'g' },
      ],
    });
    expect(r.success).toBe(false);
  });

  test('rejects more than 5 tags', () => {
    const r = parseRecipePayload({
      ...base,
      tags: ['a1', 'b1', 'c1', 'd1', 'e1', 'f1'],
    });
    expect(r.success).toBe(false);
  });

  test('rejects invalid tag pattern / length', () => {
    const r = parseRecipePayload({
      ...base,
      tags: ['UPPER'],
    });
    expect(r.success).toBe(false);
  });

  test('rejects step shorter than 5 characters', () => {
    const r = parseRecipePayload({
      ...base,
      steps: ['1234', 'This step is certainly long enough to pass validation here.'],
    });
    expect(r.success).toBe(false);
  });

  test('rejects more than 30 steps', () => {
    const steps = Array.from({ length: 31 }, (_, i) => `Step ${i + 1} — at least five characters.`);
    const r = parseRecipePayload({ ...base, steps });
    expect(r.success).toBe(false);
  });

  test('maps issues to dotted paths via zodIssuesToRecord', () => {
    const parsed = parseRecipePayload({
      ...base,
      ingredients: [
        { name: 'Salt', qty: 1, unit: 'g' },
        { name: 'salt', qty: 1, unit: 'g' },
      ],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const map = zodIssuesToRecord(parsed.error.issues);
      expect(Object.keys(map).some((k) => k.includes('ingredients'))).toBe(true);
    }
  });
});
