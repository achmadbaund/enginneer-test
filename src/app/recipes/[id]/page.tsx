'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import NextLink from 'next/link';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import type { TRecipeDocument } from '@/lib/schemas/recipe';
import { recipeKeys } from '@/lib/recipe-keys';

async function fetchRecipe(id: string): Promise<TRecipeDocument> {
  const res = await fetch(`/api/recipes/${encodeURIComponent(id)}`);
  if (res.status === 404) throw new Error('Recipe not found');
  if (!res.ok) throw new Error('Failed to load recipe');
  return res.json() as Promise<TRecipeDocument>;
}

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: recipeKeys.detail(id),
    queryFn: () => fetchRecipe(id),
    enabled: Boolean(id),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/recipes/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => ({}));
        const msg =
          typeof body === 'object' && body !== null && 'error' in body
            ? String((body as { error?: unknown }).error)
            : 'Delete failed';
        throw new Error(msg);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: recipeKeys.details() });
      router.push('/recipes');
      router.refresh();
    },
  });

  const metaLine = useMemo(() => {
    if (!data) return '';
    const totalMin = data.prepMin + data.cookMin;
    return `${totalMin} min total · ${data.servings} servings · prep ${data.prepMin} min · cook ${data.cookMin} min`;
  }, [data]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Link component={NextLink} href="/recipes" sx={{ display: 'inline-block', mb: 2 }}>
        ← All recipes
      </Link>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error">{error instanceof Error ? error.message : 'Error'}</Alert>
      )}

      {data && (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: 'flex-start' }}>
            <Typography variant="h4" sx={{ flex: 1 }}>
              {data.title}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={data.difficulty}
                color={
                  data.difficulty === 'easy'
                    ? 'success'
                    : data.difficulty === 'medium'
                      ? 'warning'
                      : 'error'
                }
              />
              <Button component={NextLink} href={`/recipes/${id}/edit`} variant="outlined">
                Edit
              </Button>
              <Button color="error" variant="outlined" onClick={() => setConfirmOpen(true)}>
                Delete
              </Button>
            </Stack>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {metaLine}
          </Typography>

          {data.tags.length > 0 && (
            <Box sx={{ mb: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {data.tags.map((t) => (
                <Chip key={t} label={t} size="small" variant="outlined" />
              ))}
            </Box>
          )}

          <Typography variant="body1" sx={{ mb: 3, whiteSpace: 'pre-wrap' }}>
            {data.description}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" sx={{ mb: 1 }}>
            Ingredients
          </Typography>
          <List dense disablePadding sx={{ mb: 3 }}>
            {data.ingredients.map((ing, i) => (
              <ListItem key={i} disableGutters>
                <ListItemText primary={`${ing.name} — ${ing.qty} ${ing.unit}`} />
              </ListItem>
            ))}
          </List>

          <Typography variant="h6" sx={{ mb: 1 }}>
            Steps
          </Typography>
          <List dense disablePadding>
            {data.steps.map((step, i) => (
              <ListItem key={i} disableGutters alignItems="flex-start">
                <ListItemText primary={`${i + 1}. ${step}`} sx={{ whiteSpace: 'pre-wrap' }} />
              </ListItem>
            ))}
          </List>

          <Dialog open={confirmOpen} onClose={() => !deleteMutation.isPending && setConfirmOpen(false)}>
            <DialogTitle>Delete recipe?</DialogTitle>
            <DialogContent>
              This permanently deletes <strong>{data.title}</strong>.
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmOpen(false)} disabled={deleteMutation.isPending}>
                Cancel
              </Button>
              <Button
                color="error"
                variant="contained"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </Button>
            </DialogActions>
          </Dialog>

          {deleteMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteMutation.error instanceof Error ? deleteMutation.error.message : 'Delete failed'}
            </Alert>
          )}
        </>
      )}
    </Container>
  );
}
