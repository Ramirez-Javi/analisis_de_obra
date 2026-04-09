import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const hasDb = !!process.env.DATABASE_URL;
  const hasSecret = !!process.env.AUTH_SECRET;

  let dbOk = false;
  let userCount = 0;
  let dbError = '';
  try {
    userCount = await prisma.usuario.count();
    dbOk = true;
  } catch (e) {
    dbError = String(e);
  }

  return NextResponse.json({ hasDb, hasSecret, dbOk, userCount, dbError });
}

