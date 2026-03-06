import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
    }
    
    if (session?.user?.email) {
      try {
        // Create or update user in database
        await prisma.user.upsert({
          where: { email: session.user.email },
          update: {
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email.split('@')[0],
            avatar: session.user.user_metadata?.avatar_url,
            username: session.user.user_metadata?.username || session.user.user_metadata?.user_name,
            firstName: session.user.user_metadata?.first_name,
            lastName: session.user.user_metadata?.last_name,
            country: session.user.user_metadata?.country,
          },
          create: {
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email.split('@')[0],
            avatar: session.user.user_metadata?.avatar_url,
            username: session.user.user_metadata?.username || session.user.user_metadata?.user_name,
            firstName: session.user.user_metadata?.first_name,
            lastName: session.user.user_metadata?.last_name,
            country: session.user.user_metadata?.country,
          },
        })
      } catch (dbError) {
        console.error('Database error:', dbError)
        // Continue anyway - user is authenticated
      }
    }
  }

  // Always redirect to dashboard after successful auth
  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
}
