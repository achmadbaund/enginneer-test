import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
}));

import { RecipeForm } from './RecipeForm';

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('RecipeForm', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/api/recipes/tags')) {
          return Promise.resolve({
            ok: true,
            json: async () => [],
          });
        }
        return Promise.resolve({ ok: false, json: async () => ({}) });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('blocks submit when client validation fails (empty title)', async () => {
    renderWithClient(<RecipeForm mode="create" />);

    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: '   ' } });

    fireEvent.click(screen.getByRole('button', { name: /^Create$/ }));

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });
});
