import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { del, list } from '@vercel/blob';

export async function POST() {
  // Authenticate the request using better-auth
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'File storage is not configured. Your account was not deleted.' }, { status: 503 });
    }

    const prefix = `resources/${session.user.id}/`;
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000, token });
      if (page.blobs.length) await del(page.blobs.map((blob) => blob.pathname), { token });
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    // Delete database data only after owned storage objects are removed.
    await prisma.user.delete({ where: { id: session.user.id } });
    return NextResponse.json({ status: true });
  } catch (err) {
    console.error('Failed to delete user and owned files:', err);
    return NextResponse.json({ error: 'Account deletion could not be completed. No database account data was removed; please retry.' }, { status: 500 });
  }
}
