'use client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Brain, Mail, ArrowRight, Loader2, Lock, User as UserIcon, Github, Globe, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    country: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.firstName || !formData.lastName || !formData.username ||
        !formData.country || !formData.email || !formData.password) {
      setMessage('Заполните все поля')
      setIsSuccess(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage('Пароли не совпадают')
      setIsSuccess(false)
      return
    }

    if (formData.password.length < 6) {
      setMessage('Пароль должен быть минимум 6 символов')
      setIsSuccess(false)
      return
    }

    setIsLoading(true)
    setMessage('')
    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          username: formData.username,
          first_name: formData.firstName,
          last_name: formData.lastName,
          country: formData.country,
        },
      },
    })

    if (authError) {
      setMessage(authError.message === 'User already registered'
        ? 'Пользователь с таким email уже существует'
        : 'Ошибка регистрации. Попробуйте ещё раз.')
      setIsSuccess(false)
      setIsLoading(false)
      return
    }

    if (authData.user) {
      const { error: dbError } = await supabase
        .from('User')
        .insert({
          id: authData.user.id,
          email: formData.email,
          username: formData.username,
          firstName: formData.firstName,
          lastName: formData.lastName,
          name: `${formData.firstName} ${formData.lastName}`,
          country: formData.country,
        })

      if (dbError) {
        console.error('Error creating user record:', dbError)
      }
    }

    setIsSuccess(true)
    setMessage('Аккаунт создан! Перенаправление...')
    setTimeout(() => { router.push('/dashboard') }, 1500)
  }

  const handleGoogleRegister = async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (error) {
      setMessage('Ошибка регистрации через Google')
      setIsSuccess(false)
      setIsLoading(false)
    }
  }

  const handleGithubRegister = async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (error) {
      setMessage('Ошибка регистрации через GitHub')
      setIsSuccess(false)
      setIsLoading(false)
    }
  }

  const inputClass = "w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 disabled:opacity-50"
  const inputStyle = (field: string) => ({
    background: 'var(--color-bg-elevated)',
    border: `1px solid ${focusedField === field ? 'var(--color-primary)' : 'var(--color-border)'}`,
    color: 'var(--color-text)',
    boxShadow: focusedField === field ? '0 0 0 3px rgba(124,58,237,0.15)' : 'none',
  })
  const iconStyle = (field: string) => ({
    color: focusedField === field ? 'var(--color-primary)' : 'var(--color-text-muted)',
  })

  // Password strength
  const pwLen = formData.password.length
  const pwStrength = pwLen === 0 ? 0 : pwLen < 6 ? 1 : pwLen < 10 ? 2 : 3
  const pwColors = ['', '#ef4444', '#f59e0b', '#10b981']
  const pwLabels = ['', 'Слабый', 'Средний', 'Надёжный']

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--color-bg)' }}>

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 animate-float"
          style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)', filter: 'blur(50px)' }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up py-8">

        {/* Logo */}
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex flex-col items-center gap-3 group">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)' }}>
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-300"
                style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)', filter: 'blur(20px)', zIndex: -1 }} />
            </div>
            <span className="text-xl font-bold text-white">AI Study Agent</span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-3xl border p-7 backdrop-blur-xl"
          style={{
            background: 'rgba(15, 14, 23, 0.85)',
            borderColor: 'var(--color-border)',
            boxShadow: '0 0 0 1px rgba(124,58,237,0.08), 0 32px 80px rgba(0,0,0,0.5)',
          }}>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">Создать аккаунт</h1>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Начните обучение с AI-наставником
            </p>
          </div>

          {/* OAuth buttons */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button onClick={handleGoogleRegister} disabled={isLoading}
              className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-light)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button onClick={handleGithubRegister} disabled={isLoading}
              className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-light)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
              <Github className="w-4 h-4 flex-shrink-0" />
              GitHub
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: '1px solid var(--color-border)' }} />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-xs font-medium"
                style={{ background: 'rgba(15, 14, 23, 0.85)', color: 'var(--color-text-muted)' }}>
                или заполните форму
              </span>
            </div>
          </div>

          {/* Registration form */}
          <form onSubmit={handleRegister} className="space-y-3.5">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Имя</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none transition-colors duration-200"
                    style={iconStyle('firstName')} />
                  <input type="text" value={formData.firstName}
                    onChange={e => handleChange('firstName', e.target.value)}
                    onFocus={() => setFocusedField('firstName')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Иван" disabled={isLoading}
                    className={inputClass} style={inputStyle('firstName')} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Фамилия</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none transition-colors duration-200"
                    style={iconStyle('lastName')} />
                  <input type="text" value={formData.lastName}
                    onChange={e => handleChange('lastName', e.target.value)}
                    onFocus={() => setFocusedField('lastName')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Иванов" disabled={isLoading}
                    className={inputClass} style={inputStyle('lastName')} />
                </div>
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Имя пользователя</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none transition-colors duration-200"
                  style={iconStyle('username')}>@</span>
                <input type="text" value={formData.username}
                  onChange={e => handleChange('username', e.target.value)}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="ivan_ivanov" disabled={isLoading}
                  className={inputClass} style={inputStyle('username')} />
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Страна</label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none transition-colors duration-200"
                  style={iconStyle('country')} />
                <input type="text" value={formData.country}
                  onChange={e => handleChange('country', e.target.value)}
                  onFocus={() => setFocusedField('country')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Россия" disabled={isLoading}
                  className={inputClass} style={inputStyle('country')} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none transition-colors duration-200"
                  style={iconStyle('email')} />
                <input type="email" value={formData.email}
                  onChange={e => handleChange('email', e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="your@email.com" disabled={isLoading}
                  className={inputClass} style={inputStyle('email')} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Пароль</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none transition-colors duration-200"
                  style={iconStyle('password')} />
                <input type={showPassword ? 'text' : 'password'} value={formData.password}
                  onChange={e => handleChange('password', e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••" disabled={isLoading}
                  className={`${inputClass} pr-10`} style={inputStyle('password')} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200 hover:text-white"
                  style={{ color: 'var(--color-text-muted)' }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Password strength bar */}
              {formData.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{
                          background: i <= pwStrength ? pwColors[pwStrength] : 'var(--color-bg-elevated)',
                          opacity: i <= pwStrength ? 1 : 0.4,
                        }} />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: pwStrength > 0 ? pwColors[pwStrength] : 'var(--color-text-muted)' }}>
                    {pwLabels[pwStrength]}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Подтвердите пароль</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none transition-colors duration-200"
                  style={iconStyle('confirmPassword')} />
                <input type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword}
                  onChange={e => handleChange('confirmPassword', e.target.value)}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••" disabled={isLoading}
                  className={`${inputClass} pr-10`}
                  style={{
                    ...inputStyle('confirmPassword'),
                    borderColor: formData.confirmPassword && formData.confirmPassword !== formData.password
                      ? 'rgba(239,68,68,0.5)'
                      : formData.confirmPassword && formData.confirmPassword === formData.password
                      ? 'rgba(16,185,129,0.5)'
                      : focusedField === 'confirmPassword' ? 'var(--color-primary)' : 'var(--color-border)',
                  }} />
                <button type="button" onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200 hover:text-white"
                  style={{ color: 'var(--color-text-muted)' }}>
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {formData.confirmPassword && formData.confirmPassword === formData.password && (
                  <CheckCircle2 className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#10b981' }} />
                )}
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
                {isSuccess && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                {message}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group mt-1"
              style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)' }}>
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }} />
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"
                style={{ boxShadow: '0 0 30px rgba(124,58,237,0.4)' }} />
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Создание аккаунта...</>
              ) : (
                <>Создать аккаунт<ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" /></>
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm mt-5" style={{ color: 'var(--color-text-muted)' }}>
            Уже есть аккаунт?{' '}
            <Link href="/login" className="font-semibold transition-colors duration-200 hover:text-white"
              style={{ color: 'var(--color-primary)' }}>
              Войти
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-5" style={{ color: 'var(--color-text-muted)' }}>
          Создавая аккаунт, вы соглашаетесь с{' '}
          <span className="hover:text-white cursor-pointer transition-colors" style={{ color: 'var(--color-primary)' }}>
            условиями использования
          </span>
        </p>
      </div>
    </div>
  )
}
