import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import NextLink from 'next/link';

export default function HomePage() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h1" sx={{ mb: 2, fontSize: { xs: '2rem', md: '3rem' } }}>
        Recipe Manager
      </Typography>
      <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
        Senior Fullstack Engineer Interview Test
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="body1" sx={{ mb: 1 }}>
          👋 Welcome, candidate! Start by reading <strong>CANDIDATE.md</strong> at the root of
          this repository — it contains the task brief, requirements, and timebox guidance.
        </Typography>
        <Typography variant="body1">
          An example implementation (conventions you should follow) lives at{' '}
          <Link component={NextLink} href="/recipes-example">
            /recipes-example
          </Link>
          . Review the source code there before building your own feature.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Link component={NextLink} href="/recipes" variant="button">
          Open Recipe Manager →
        </Link>
        <Link component={NextLink} href="/recipes-example" variant="button" color="inherit">
          View scaffold example →
        </Link>
      </Box>
    </Container>
  );
}
