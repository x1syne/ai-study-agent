'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { setUser, setLoading } = useAppStore()

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user || null
      setSupabaseUser(user)
      
      if (user) {
        setUser({
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar: user.user_metadata?.avatar_url || null,
        })
      } else {
        setUser(null)
      }
      
      setIsLoading(false)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user || null
        setSupabaseUser(user)
        
        if (user) {
          setUser({
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            avatar: user.user_metadata?.avatar_url || null,
          })
        } else {
          setUser(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [setUser, setLoading])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
  }

  return {
    user: supabaseUser,
    isLoading,
    signOut,
  }
}
