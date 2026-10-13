import { NextResponse } from 'next/server';
import { getPopularSearchTerms, recordSearchTerm } from '@/lib/popular-searches';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const terms = await getPopularSearchTerms(7);
    return NextResponse.json({
      success: true,
      terms: terms || [],
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      terms: [],
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = body?.query;
    if (typeof query === 'string' && query.trim().length >= 2) {
      await recordSearchTerm(query.trim());
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
