import mongoose from 'mongoose';
import { RecipeModel } from '@/lib/schemas/recipe';
import { escapeRegex } from '@/lib/escape-regex';

/** Returns an existing recipe with the same title (trimmed, case-insensitive), if any. */
export async function findRecipeByNormalizedTitle(title: string, excludeId?: string) {
  const trimmed = title.trim();
  const pattern = new RegExp(`^${escapeRegex(trimmed)}$`, 'i');

  const filter: Record<string, unknown> = { title: pattern };
  if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
    filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
  }

  return RecipeModel.findOne(filter).select('_id').lean();
}
