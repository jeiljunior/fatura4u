import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/admin', req.nextUrl.origin))
  response.cookies.delete('admin_impersonating_business_id')
  response.cookies.delete('admin_impersonating')
  return response
}
