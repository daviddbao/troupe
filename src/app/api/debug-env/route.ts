import { NextResponse } from 'next/server'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || ''
  const masked = dbUrl.replace(/:([^:@]+)@/, ':***@')
  return NextResponse.json({
    DATABASE_URL_masked: masked || '(not set)',
    NODE_TLS: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  })
}
