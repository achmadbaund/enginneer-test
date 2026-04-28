'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import type { TRecipeDocument } from '@/lib/schemas/recipe';
import { recipeKeys } from '@/lib/recipe-keys';
import { RecipeForm } from '@/components/RecipeForm';

async function fetchRecipe(id: string): Promise<TRecipeDocument> {
  const res = await fetch(`/api/recipes/${encodeURIComponent(id)}`);
  if (res.status === 404) throw new Error('Recipe not found');
  if (!res.ok) throw new Error('Failed to load recipe');
  return res.json() as Promise<TRecipeDocument>;
}

export default function EditRecipePage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';

  const { data, isLoading, error } = useQuery({
    queryKey: recipeKeys.detail(id),
    queryFn: () => fetchRecipe(id),
    enabled: Boolean(id),
  });

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Link component={NextLink} href={id ? `/recipes/${id}` : '/recipes'} sx={{ display: 'inline-block', mb: 2 }}>
        ← Back
      </Link>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error">{error instanceof Error ? error.message : 'Error'}</Alert>
      )}

      {data && <RecipeForm mode="edit" recipeId={id} initialRecipe={data} />}
    </Container>
  );
}
