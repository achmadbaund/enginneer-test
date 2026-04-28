/**
 * Query key factory for Recipe queries.
 *
 * Use these keys for ALL React Query operations — do not inline raw arrays.
 * This ensures consistent cache invalidation across mutations and queries.
 *
 * @example
 *   useQuery({ queryKey: recipeKeys.list({ search: 'pasta' }), queryFn: ... })
 *   queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
 */
export const recipeKeys = {
  all: ['recipes'] as const,

  lists: () => [...recipeKeys.all, 'list'] as const,

  list: (filters: {
    search?: string;
    tags?: string[];
    difficulty?: string;
    page?: number;
    pageSize?: number;
    cursor?: string;
  } = {}) => [...recipeKeys.lists(), filters] as const,

  details: () => [...recipeKeys.all, 'detail'] as const,

  detail: (id: string) => [...recipeKeys.details(), id] as const,

  /** Distinct tag strings for autocomplete / filters */
  tagOptions: () => [...recipeKeys.all, 'tag-options'] as const,
} as const;

export type RecipeFilters = Parameters<typeof recipeKeys.list>[0];
