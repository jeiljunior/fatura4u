import { NextRequest, NextResponse } from 'next/server'
import { platformAdminOrNull, logAdmin } from '@/lib/platformAdmin'

export async function POST(req: NextRequest) {
  const businessId = req.cookies.get('admin_impersonating_business_id')?.value ?? null
  const admin = await platformAdminOrNull()
  if (admin && businessId) await logAdmin(admin, 'impersonate.end', businessId)

  const response = NextResponse.redirect(new URL('/admin', req.nextUrl.origin))
  response.cookies.delete('admin_impersonating_business_id')
  response.cookies.delete('admin_impersonating')
  return response
}
