import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { withPrismaRetry } from '@/lib/prisma-retry'

export async function getCurrentUser() {
  // В режиме разработки с SKIP_AUTH возвращаем тестового пользователя
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
    return withPrismaRetry(async () => {
      let user = await prisma.user.findFirst()
      
      if (!user) {
        // Создаём тестового пользователя если его нет
        user = await prisma.user.create({
          data: {
            email: 'test@example.com',
            name: 'Test User',
          },
        })
      }
      
      return user
    })
  }

  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user?.email) {
    return null
  }

  // Find or create user with retry
  return withPrismaRetry(async () => {
    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      const email = session.user.email ?? ''
      user = await prisma.user.create({
        data: {
          email,
          name: session.user.user_metadata?.full_name || email.split('@')[0],
          avatar: session.user.user_metadata?.avatar_url,
        },
      })
    }

    return user
  })
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}
