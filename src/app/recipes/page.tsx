'use client';

import { useEffect, useMemo, useState, type FocusEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import NextLink from 'next/link';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Link from '@mui/material/Link';
import Autocomplete from '@mui/material/Autocomplete';
import type { TRecipeDocument } from '@/lib/schemas/recipe';
import { recipeKeys } from '@/lib/recipe-keys';

type ListResponse = {
  recipes: TRecipeDocument[];
  total: number;
  page: number;
  pageSize: number;
};

async function fetchRecipes(filters: {
  search: string;
  tags: string[];
  difficulty: string;
  page: number;
  pageSize: number;
}): Promise<ListResponse> {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));

  const res = await fetch(`/api/recipes?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch recipes');
  return res.json() as Promise<ListResponse>;
}

async function fetchTagOptions(): Promise<string[]> {
  const res = await fetch('/api/recipes/tags');
  if (!res.ok) throw new Error('Failed to load tags');
  return res.json() as Promise<string[]>;
}

function normalizeFilterTagList(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw) {
    const t = String(v).trim().toLowerCase();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export default function RecipesListPage() {
  const pageSize = 12;

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagFilterInput, setTagFilterInput] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, difficulty, selectedTags.join('|')]);

  const queryFilters = useMemo(
    () => ({
      search: debouncedSearch,
      tags: selectedTags,
      difficulty,
      page,
      pageSize,
    }),
    [debouncedSearch, selectedTags, difficulty, page]
  );

  const {
    data,
    isLoading,
    error,
    isFetching,
  } = useQuery({
    queryKey: recipeKeys.list({
      search: debouncedSearch || undefined,
      tags: selectedTags.length ? selectedTags : undefined,
      difficulty: difficulty || undefined,
      page,
      pageSize,
    }),
    queryFn: () => fetchRecipes(queryFilters),
  });

  const { data: tagOptions = [] } = useQuery({
    queryKey: recipeKeys.tagOptions(),
    queryFn: fetchTagOptions,
  });

  const mergedFilterTagOptions = useMemo(() => {
    const set = new Set([...tagOptions, ...selectedTags]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tagOptions, selectedTags]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems={{ sm: 'center' }}>
        <Typography variant="h4" sx={{ flex: 1 }}>
          Recipes
        </Typography>
        <Button component={NextLink} href="/recipes/new" variant="contained">
          New recipe
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <Link component={NextLink} href="/">
          Home
        </Link>
        {' · '}
        <Link component={NextLink} href="/recipes-example">
          Scaffold example
        </Link>
      </Typography>

      <Stack spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Search"
          placeholder="Title, description, tags, ingredients, steps…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          fullWidth
          size="small"
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="easy">easy</MenuItem>
            <MenuItem value="medium">medium</MenuItem>
            <MenuItem value="hard">hard</MenuItem>
          </TextField>

          <Autocomplete
            multiple
            freeSolo
            selectOnFocus
            clearOnBlur={false}
            options={mergedFilterTagOptions}
            value={selectedTags}
            inputValue={tagFilterInput}
            onInputChange={(_, val, reason) => {
              if (reason === 'reset') return;
              setTagFilterInput(val);
            }}
            onChange={(_, raw) => {
              setSelectedTags(normalizeFilterTagList(raw.map((x) => String(x))));
              setTagFilterInput('');
            }}
            renderTags={(value: readonly string[], getTagProps) =>
              value.map((option: string, index: number) => (
                <Chip {...getTagProps({ index })} key={`${option}-${index}`} label={option} size="small" />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tags (multi-select)"
                size="small"
                placeholder="Pilih atau tulis tag (mis. ayam), Enter / klik luar"
                onBlur={(e) => {
                  params.inputProps?.onBlur?.(e as FocusEvent<HTMLInputElement>);
                  const pending = tagFilterInput.trim().toLowerCase();
                  if (!pending) return;
                  setSelectedTags((prev) => normalizeFilterTagList([...prev, pending]));
                  setTagFilterInput('');
                }}
              />
            )}
            sx={{ flex: 1 }}
          />
        </Stack>
      </Stack>

      {isFetching && !isLoading && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Updating…
        </Typography>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error">{error instanceof Error ? error.message : 'Load failed'}</Alert>
      )}

      {data && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {data.total} recipe{data.total === 1 ? '' : 's'}
            {debouncedSearch.trim() ? ` matching “${debouncedSearch.trim()}”` : ''}
          </Typography>

          <Stack spacing={2} data-testid="recipe-list">
            {data.recipes.map((recipe) => {
              const id = String(recipe._id);
              const totalMin = recipe.prepMin + recipe.cookMin;
              return (
                <Card key={id} variant="outlined" data-testid="recipe-card">
                  <CardActionArea component={NextLink} href={`/recipes/${id}`}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="h6" sx={{ flex: 1 }}>
                          {recipe.title}
                        </Typography>
                        <Chip
                          label={recipe.difficulty}
                          size="small"
                          color={
                            recipe.difficulty === 'easy'
                              ? 'success'
                              : recipe.difficulty === 'medium'
                                ? 'warning'
                                : 'error'
                          }
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {totalMin} min total · {recipe.servings} servings
                      </Typography>
                      {recipe.tags.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {recipe.tags.map((tag) => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Stack>

          {data.recipes.length === 0 && (
            <Typography variant="body1" sx={{ mt: 2 }}>
              No recipes match your filters.
            </Typography>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => setPage(p)}
              color="primary"
              disabled={totalPages <= 1}
            />
          </Box>
        </>
      )}
    </Container>
  );
}
