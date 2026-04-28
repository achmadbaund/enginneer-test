'use client';

import { useMemo, useState, type FocusEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import type { TRecipeDocument } from '@/lib/schemas/recipe';
import { parseRecipePayload, zodIssuesToRecord } from '@/lib/recipe-validation';
import { recipeKeys } from '@/lib/recipe-keys';

async function fetchTagOptions(): Promise<string[]> {
  const res = await fetch('/api/recipes/tags');
  if (!res.ok) throw new Error('Failed to load tags');
  return res.json() as Promise<string[]>;
}

export type RecipeFormProps = {
  mode: 'create' | 'edit';
  recipeId?: string;
  /** When editing, pass loaded document */
  initialRecipe?: TRecipeDocument | null;
};

function toFormStateFromRecipe(r: TRecipeDocument) {
  return {
    title: r.title,
    description: r.description,
    servings: r.servings,
    prepMin: r.prepMin,
    cookMin: r.cookMin,
    difficulty: r.difficulty,
    tags: [...r.tags],
    ingredients: r.ingredients.map((i) => ({ ...i })),
    steps: [...r.steps],
  };
}

const defaultCreate = {
  title: '',
  description: '',
  servings: 4,
  prepMin: 10,
  cookMin: 15,
  difficulty: 'easy' as const,
  tags: [] as string[],
  ingredients: [{ name: '', qty: 1, unit: 'g' }],
  steps: ['Wash and prepare all ingredients before cooking.'],
};

const MAX_RECIPE_TAGS = 5;

/** Trim, lowercase, dedupe — matches server tag rules (`^[a-z0-9-]+$`). */
function normalizeRecipeTagList(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw) {
    const t = String(v).trim().toLowerCase();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_RECIPE_TAGS) break;
  }
  return out;
}

export function RecipeForm({ mode, recipeId, initialRecipe }: RecipeFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: tagOptions = [] } = useQuery({
    queryKey: recipeKeys.tagOptions(),
    queryFn: fetchTagOptions,
  });

  const [form, setForm] = useState(() =>
    mode === 'edit' && initialRecipe ? toFormStateFromRecipe(initialRecipe) : defaultCreate
  );

  /** Controlled input so custom tags can be committed with Enter or on blur. */
  const [tagInputValue, setTagInputValue] = useState('');

  /** Suggestions: API tags + tags already on this recipe (custom tags stay selectable). */
  const mergedOptions = useMemo(() => {
    const set = new Set([...tagOptions, ...form.tags]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tagOptions, form.tags]);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const url =
        mode === 'create' ? '/api/recipes' : `/api/recipes/${encodeURIComponent(recipeId ?? '')}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data === 'object' && data !== null && 'error' in data
            ? String((data as { error?: unknown }).error)
            : 'Request failed';
        const err = new Error(msg) as Error & { status?: number; body?: unknown };
        err.status = res.status;
        err.body = data;
        throw err;
      }
      return data as TRecipeDocument;
    },
    onSuccess: (doc) => {
      void queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: recipeKeys.tagOptions() });
      void queryClient.invalidateQueries({ queryKey: recipeKeys.details() });
      router.push(`/recipes/${String(doc._id)}`);
      router.refresh();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setFieldErrors({});

    const payload = {
      title: form.title,
      description: form.description,
      servings: form.servings,
      prepMin: form.prepMin,
      cookMin: form.cookMin,
      difficulty: form.difficulty,
      tags: form.tags,
      ingredients: form.ingredients,
      steps: form.steps,
    };

    const parsed = parseRecipePayload(payload);
    if (!parsed.success) {
      setFieldErrors(zodIssuesToRecord(parsed.error.issues));
      return;
    }

    saveMutation.mutate(parsed.data as unknown as Record<string, unknown>, {
      onError: (err: Error & { status?: number; body?: unknown }) => {
        if (err.status === 400 && err.body && typeof err.body === 'object') {
          const raw = (err.body as { issues?: unknown }).issues;
          if (Array.isArray(raw)) {
            const mapped: Record<string, string> = {};
            for (const item of raw as { path?: unknown[]; message?: string }[]) {
              const path = Array.isArray(item.path) ? item.path : [];
              const key = path.length ? path.join('.') : '_form';
              if (item.message && !mapped[key]) mapped[key] = item.message;
            }
            setFieldErrors(mapped);
          }
        }
        setSubmitError(err.message);
      },
    });
  }

  function updateIngredient(index: number, patch: Partial<(typeof form.ingredients)[0]>) {
    setForm((s) => ({
      ...s,
      ingredients: s.ingredients.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function updateStep(index: number, value: string) {
    setForm((s) => ({
      ...s,
      steps: s.steps.map((st, i) => (i === index ? value : st)),
    }));
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={3} sx={{ maxWidth: 720 }}>
        <Typography variant="h5">{mode === 'create' ? 'New recipe' : 'Edit recipe'}</Typography>

        {submitError && (
          <Alert severity="error" onClose={() => setSubmitError(null)}>
            {submitError}
          </Alert>
        )}
        {fieldErrors._form && <Alert severity="error">{fieldErrors._form}</Alert>}

        <TextField
          label="Title"
          required
          value={form.title}
          onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
          error={Boolean(fieldErrors.title)}
          helperText={fieldErrors.title}
        />

        <TextField
          label="Description"
          required
          multiline
          minRows={3}
          value={form.description}
          onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
          error={Boolean(fieldErrors.description)}
          helperText={fieldErrors.description}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Servings"
            type="number"
            required
            inputProps={{ min: 1 }}
            value={form.servings}
            onChange={(e) => setForm((s) => ({ ...s, servings: Number(e.target.value) }))}
            error={Boolean(fieldErrors.servings)}
            helperText={fieldErrors.servings}
            sx={{ flex: 1 }}
          />
          <TextField
            select
            label="Difficulty"
            value={form.difficulty}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                difficulty: e.target.value as typeof s.difficulty,
              }))
            }
            sx={{ flex: 1 }}
          >
            <MenuItem value="easy">easy</MenuItem>
            <MenuItem value="medium">medium</MenuItem>
            <MenuItem value="hard">hard</MenuItem>
          </TextField>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Prep (minutes)"
            type="number"
            required
            inputProps={{ min: 0 }}
            value={form.prepMin}
            onChange={(e) => setForm((s) => ({ ...s, prepMin: Number(e.target.value) }))}
            error={Boolean(fieldErrors.prepMin)}
            helperText={fieldErrors.prepMin ?? 'prep + cook: 1–1440 min total'}
            sx={{ flex: 1 }}
          />
          <TextField
            label="Cook (minutes)"
            type="number"
            required
            inputProps={{ min: 0 }}
            value={form.cookMin}
            onChange={(e) => setForm((s) => ({ ...s, cookMin: Number(e.target.value) }))}
            error={Boolean(fieldErrors.cookMin)}
            helperText={fieldErrors.cookMin}
            sx={{ flex: 1 }}
          />
        </Stack>

        <Autocomplete
          multiple
          freeSolo
          selectOnFocus
          clearOnBlur={false}
          options={mergedOptions}
          value={form.tags}
          inputValue={tagInputValue}
          onInputChange={(_, val, reason) => {
            if (reason === 'reset') return;
            setTagInputValue(val);
          }}
          onChange={(_, raw) => {
            const tags = normalizeRecipeTagList(raw.map((x) => (typeof x === 'string' ? x : String(x))));
            setForm((s) => ({ ...s, tags }));
            setTagInputValue('');
          }}
          renderTags={(value: readonly string[], getTagProps) =>
            value.map((option: string, index: number) => (
              <Chip
                variant="outlined"
                label={option}
                {...getTagProps({ index })}
                key={`${option}-${index}`}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Tags"
              placeholder="Tulis tag baru (mis. ayam), Enter atau klik di luar"
              helperText="Tag custom boleh. Format: huruf kecil, angka, strip — 2–20 karakter per tag, maks. 5 tag."
              error={Boolean(
                fieldErrors.tags ||
                  Object.keys(fieldErrors).some((k) => k === 'tags' || k.startsWith('tags.'))
              )}
              onBlur={(e) => {
                params.inputProps?.onBlur?.(e as FocusEvent<HTMLInputElement>);
                const pending = tagInputValue.trim().toLowerCase();
                if (!pending) return;
                setForm((s) => {
                  if (s.tags.includes(pending) || s.tags.length >= MAX_RECIPE_TAGS) return s;
                  return { ...s, tags: [...s.tags, pending] };
                });
                setTagInputValue('');
              }}
            />
          )}
        />
        {Object.entries(fieldErrors)
          .filter(([k]) => k === 'tags' || k.startsWith('tags.'))
          .map(([k, msg]) => (
            <Typography key={k} variant="caption" color="error" display="block">
              {msg}
            </Typography>
          ))}

        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Ingredients
          </Typography>
          <Stack spacing={1}>
            {form.ingredients.map((ing, index) => (
              <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-start">
                <TextField
                  label="Name"
                  value={ing.name}
                  onChange={(e) => updateIngredient(index, { name: e.target.value })}
                  sx={{ flex: 2 }}
                  error={Boolean(
                    fieldErrors[`ingredients.${index}.name`] ?? fieldErrors.ingredients
                  )}
                  helperText={
                    fieldErrors[`ingredients.${index}.name`] ?? fieldErrors.ingredients
                  }
                />
                <TextField
                  label="Qty"
                  type="number"
                  value={ing.qty}
                  onChange={(e) => updateIngredient(index, { qty: Number(e.target.value) })}
                  sx={{ flex: 1 }}
                  inputProps={{ min: 0.0001, step: 'any' }}
                />
                <TextField
                  label="Unit"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(index, { unit: e.target.value })}
                  sx={{ flex: 1 }}
                />
                <IconButton
                  aria-label="Remove ingredient"
                  onClick={() =>
                    setForm((s) => ({
                      ...s,
                      ingredients: s.ingredients.filter((_, i) => i !== index),
                    }))
                  }
                  disabled={form.ingredients.length <= 1}
                  sx={{ mt: 1 }}
                >
                  ✕
                </IconButton>
              </Stack>
            ))}
            <Button
              type="button"
              variant="outlined"
              onClick={() =>
                setForm((s) => ({
                  ...s,
                  ingredients: [...s.ingredients, { name: '', qty: 1, unit: 'g' }],
                }))
              }
            >
              + Add ingredient
            </Button>
          </Stack>
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Steps
          </Typography>
          <Stack spacing={1}>
            {form.steps.map((step, index) => (
              <Stack key={index} direction="row" spacing={1} alignItems="flex-start">
                <TextField
                  label={`Step ${index + 1}`}
                  multiline
                  fullWidth
                  minRows={2}
                  value={step}
                  onChange={(e) => updateStep(index, e.target.value)}
                  error={Boolean(fieldErrors[`steps.${index}`])}
                  helperText={fieldErrors[`steps.${index}`]}
                />
                <IconButton
                  aria-label="Remove step"
                  onClick={() =>
                    setForm((s) => ({
                      ...s,
                      steps: s.steps.filter((_, i) => i !== index),
                    }))
                  }
                  disabled={form.steps.length <= 1}
                  sx={{ mt: 1 }}
                >
                  ✕
                </IconButton>
              </Stack>
            ))}
            <Button
              type="button"
              variant="outlined"
              onClick={() =>
                setForm((s) => ({
                  ...s,
                  steps: [...s.steps, 'Describe this step clearly in at least five characters.'],
                }))
              }
            >
              + Add step
            </Button>
          </Stack>
        </Box>

        <Stack direction="row" spacing={2}>
          <Button type="submit" variant="contained" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
          </Button>
          <Button type="button" onClick={() => router.back()}>
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
