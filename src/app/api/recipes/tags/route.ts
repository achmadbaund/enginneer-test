import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { RecipeModel } from '@/lib/schemas/recipe';

/** Distinct tag values across all recipes (for filter UI). */
export async function GET() {
  try {
    await connectDB();

    const raw = (await RecipeModel.distinct('tags')) as string[];
    const tags = raw.filter(Boolean).sort((a, b) => a.localeCompare(b));

    return NextResponse.json(tags);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
