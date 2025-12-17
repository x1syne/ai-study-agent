import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function getCurrentUser() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user?.email) {
    return null
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: session.user.email,
        name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
        avatar: session.user.user_metadata?.avatar_url,
      },
    })
  }

  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}
