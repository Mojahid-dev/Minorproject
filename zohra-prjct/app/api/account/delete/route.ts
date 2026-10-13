import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { del } from '@vercel/blob';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  // Authenticate the request using better-auth
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resources = await prisma.resource.findMany({
      where: { userId: session.user.id },
      select: { storageKey: true },
    });
    const storageKeys = resources.map((resource) => resource.storageKey);
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (storageKeys.length > 0 && !blobToken) {
      return NextResponse.json(
        { error: 'File storage is not configured. Your account was not deleted.' },
        { status: 503 },
      );
    }

    if (storageKeys.length > 0 && blobToken) {
      await del(storageKeys, { token: blobToken });
    }

    // Delete database records only after stored files have been removed.
    await prisma.user.delete({ where: { id: session.user.id } });
    return NextResponse.json({ status: true });
  } catch (err) {
    console.error('Failed to delete user:', err);
    return NextResponse.json(
      { error: 'Unable to finish account deletion. Please retry.' },
      { status: 500 },
    );
  }
}
