import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  // Authenticate the request using better-auth
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Delete the user (cascades will remove sessions/accounts because of schema)
    await prisma.user.delete({ where: { id: session.user.id } });
    return NextResponse.json({ status: true });
  } catch (err) {
    console.error('Failed to delete user:', err);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
