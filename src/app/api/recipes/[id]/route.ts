import { type NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { RecipeModel } from '@/lib/schemas/recipe';
import { parseRecipePayload } from '@/lib/recipe-validation';
import { findRecipeByNormalizedTitle } from '@/lib/recipe-title-unique';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid recipe id' }, { status: 400 });
    }

    const recipe = await RecipeModel.findById(id).lean();
    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    return NextResponse.json(recipe);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid recipe id' }, { status: 400 });
    }

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

    const dup = await findRecipeByNormalizedTitle(parsed.data.title, id);
    if (dup) {
      return NextResponse.json(
        { error: 'A recipe with this title already exists (case-insensitive).' },
        { status: 409 }
      );
    }

    const updated = await RecipeModel.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid recipe id' }, { status: 400 });
    }

    const deleted = await RecipeModel.findByIdAndDelete(id).lean();
    if (!deleted) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
