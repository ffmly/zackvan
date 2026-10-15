import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

const ALLOWED_FOLDER_PREFIX = 'zakivan/';

export async function POST(request: NextRequest) {
  // Cloudinary upload API keys are public by design. Keep the secret server-only,
  // but read the public key from the same variable documented in .env.example.
  const apiKey =
    process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ?? process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const folder =
    process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER ?? ALLOWED_FOLDER_PREFIX;

  if (!apiKey || !apiSecret || !cloudName) {
    return NextResponse.json(
      { error: 'Cloudinary is not configured on the server.' },
      { status: 500 },
    );
  }

  let bodyFolder: unknown;
  try {
    const body = await request.json().catch(() => ({}));
    bodyFolder = (body as { folder?: unknown }).folder;
  } catch {
    bodyFolder = undefined;
  }

  const resolvedFolder =
    typeof bodyFolder === 'string' &&
    bodyFolder.startsWith(ALLOWED_FOLDER_PREFIX)
      ? bodyFolder
      : folder;

  if (!resolvedFolder.startsWith(ALLOWED_FOLDER_PREFIX)) {
    return NextResponse.json(
      { error: 'Invalid upload folder.' },
      { status: 400 },
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `folder=${resolvedFolder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(`${toSign}${apiSecret}`)
    .digest('hex');

  return NextResponse.json({
    signature,
    timestamp,
    folder: resolvedFolder,
    apiKey,
    cloudName,
  });
}
