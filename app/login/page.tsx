'use client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Brain, Mail, ArrowRight, Loader2, Lock, Github } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setMessage('Введите email и пароль')
      setIsSuccess(false)
      return
    }

    setIsLoading(true)
    setMessage('')
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage('Неверный email или пароль')
      setIsSuccess(false)
      setIsLoading(false)
    } else {
      setIsSuccess(true)
      setMessage('Вход выполнен! Перенаправление...')
      router.push('/dashboard')
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (error) {
      setMessage('Ошибка входа через Google')
      setIsSuccess(false)
      setIsLoading(false)
    }
  }

  const handleGithubLogin = async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (error) {
      setMessage('Ошибка входа через GitHub')
      setIsSuccess(false)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--color-bg)' }}>

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 animate-float"
          style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)', filter: 'blur(80px)', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 60%)', filter: 'blur(100px)' }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3 group">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)' }}>
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-300"
                style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)', filter: 'blur(20px)', zIndex: -1 }} />
            </div>
            <div>
              <span className="text-2xl font-bold text-white block">AI Study Agent</span>
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Умный помощник в обучении</span>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-3xl border p-8 backdrop-blur-xl"
          style={{
            background: 'rgba(15, 14, 23, 0.8)',
            borderColor: 'var(--color-border)',
            boxShadow: '0 0 0 1px rgba(124,58,237,0.08), 0 32px 80px rgba(0,0,0,0.5)',
          }}>

          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold text-white">Добро пожаловать</h1>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Войдите, чтобы продолжить обучение
            </p>
          </div>

          {/* OAuth buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-light)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>

            <button
              onClick={handleGithubLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-light)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            >
              <Github className="w-4 h-4 flex-shrink-0" />
              GitHub
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: '1px solid var(--color-border)' }} />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-xs font-medium"
                style={{ background: 'rgba(15, 14, 23, 0.8)', color: 'var(--color-text-muted)' }}>
                или войдите по email
              </span>
            </div>
          </div>

          {/* Email/Password form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {/* Email field */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors duration-200"
                  style={{ color: focusedField === 'email' ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="your@email.com"
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: 'var(--color-bg-elevated)',
                    border: `1px solid ${focusedField === 'email' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    color: 'var(--color-text)',
                    boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(124,58,237,0.15)' : 'none',
                  }}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Пароль
                </label>
                <button type="button" className="text-xs transition-colors duration-200 hover:text-white"
                  style={{ color: 'var(--color-primary)' }}>
                  Забыли пароль?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors duration-200"
                  style={{ color: focusedField === 'password' ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: 'var(--color-bg-elevated)',
                    border: `1px solid ${focusedField === 'password' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    color: 'var(--color-text)',
                    boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(124,58,237,0.15)' : 'none',
                  }}
                />
              </div>
            </div>

            {/* Message */}
            {message && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{
                  background: isSuccess ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${isSuccess ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  color: isSuccess ? '#10b981' : '#ef4444',
                }}>
                {message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
              style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)' }}
            >
              {/* Shimmer */}
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }} />
              {/* Glow */}
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"
                style={{ boxShadow: '0 0 30px rgba(124,58,237,0.4)' }} />

              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Вход...
                </>
              ) : (
                <>
                  Войти
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Register link */}
          <p className="text-center text-sm mt-6" style={{ color: 'var(--color-text-muted)' }}>
            Нет аккаунта?{' '}
            <Link href="/register"
              className="font-semibold transition-colors duration-200 hover:text-white"
              style={{ color: 'var(--color-primary)' }}>
              Зарегистрироваться
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: 'var(--color-text-muted)' }}>
          При входе вы соглашаетесь с{' '}
          <span className="hover:text-white cursor-pointer transition-colors" style={{ color: 'var(--color-primary)' }}>условиями использования</span>
        </p>
      </div>
    </div>
  )
}
