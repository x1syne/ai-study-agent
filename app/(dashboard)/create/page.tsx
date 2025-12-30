'use client'

/**
 * 🎓 CREATE PAGE - Redirect to create-course
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CreatePage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/create-course')
  }, [router])
  
  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
      <div className="text-zinc-400">Перенаправление...</div>
    </div>
  )
}
