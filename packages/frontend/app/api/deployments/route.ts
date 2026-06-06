import { NextResponse } from 'next/server';
import { readFile }     from 'fs/promises';
import { join }         from 'path';

export async function GET() {
  try {
    const filePath = join(process.cwd(), '..', 'backend', 'config', 'deployments.json');
    const data     = await readFile(filePath, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ error: 'deployments.json not found — run deploy script first' }, { status: 404 });
  }
}
