import { NextResponse } from 'next/server';

// Endpoint deshabilitado por seguridad
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

