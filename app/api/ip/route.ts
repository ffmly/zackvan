import { NextResponse, type NextRequest } from 'next/server';

export function GET(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip =
    forwarded?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unavailable';

  return NextResponse.json({ ip });
}
