import { type NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { RecipeModel } from '@/lib/schemas/recipe';
import { parseRecipePayload } from '@/lib/recipe-validation';
import { findRecipeByNormalizedTitle } from '@/lib/recipe-title-unique';
import { escapeRegex } from '@/lib/escape-regex';

function parseTagsParam(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') ?? '').trim();
    const difficulty = searchParams.get('difficulty') ?? '';
    const tags = parseTagsParam(searchParams.get('tags'));
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') ?? '20')));

    const query: Record<string, unknown> = {};

    if (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard') {
      query.difficulty = difficulty;
    }

    if (tags.length > 0) {
      query.tags = { $all: tags };
    }

    if (search.length > 0) {
      const rx = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { title: rx },
        { description: rx },
        { tags: rx },
        { 'ingredients.name': rx },
        { steps: rx },
      ];
    }

    const skip = (page - 1) * pageSize;

    const [recipes, total] = await Promise.all([
      RecipeModel.find(query).sort({ title: 1 }).skip(skip).limit(pageSize).lean(),
      RecipeModel.countDocuments(query),
    ]);

    return NextResponse.json({
      recipes,
      total,
      page,
      pageSize,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body: unknown = await request.json();
    const parsed = parseRecipePayload(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
        },
        { status: 400 }
      );
    }

    const dup = await findRecipeByNormalizedTitle(parsed.data.title);
    if (dup) {
      return NextResponse.json(
        { error: 'A recipe with this title already exists (case-insensitive).' },
        { status: 409 }
      );
    }

    const recipe = await RecipeModel.create(parsed.data);
    return NextResponse.json(recipe, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
