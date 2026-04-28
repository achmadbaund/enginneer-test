'use client';

import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import { RecipeForm } from '@/components/RecipeForm';

export default function NewRecipePage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Link component={NextLink} href="/recipes" sx={{ display: 'inline-block', mb: 2 }}>
        ← Back to recipes
      </Link>
      <RecipeForm mode="create" />
    </Container>
  );
}
