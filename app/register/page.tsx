'use client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Brain, Mail, ArrowRight, Loader2, Lock, User as UserIcon, Github, Globe } from 'lucide-react'
import { Card, CardContent, Button, Input } from '@/components/ui'
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

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Валидация
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

    // Регистрация в Supabase Auth
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

    // Создание записи в таблице User
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
    setMessage('Регистрация успешна! Перенаправление...')
    setTimeout(() => {
      router.push('/dashboard')
    }, 1500)
  }

  const handleGoogleRegister = async () => {
    setIsLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
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
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setMessage('Ошибка регистрации через GitHub')
      setIsSuccess(false)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">AI Study Agent</span>
          </Link>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">Регистрация</h1>
              <p className="text-slate-400 mt-1">
                Создайте аккаунт для начала обучения
              </p>
            </div>

            {/* Google register */}
            <Button
              variant="secondary"
              onClick={handleGoogleRegister}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Регистрация через Google
            </Button>

            {/* GitHub register */}
            <Button
              variant="secondary"
              onClick={handleGithubRegister}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Github className="w-5 h-5 mr-2" />
              )}
              Регистрация через GitHub
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-slate-800 text-slate-400 text-sm">или заполните форму</span>
              </div>
            </div>

            {/* Registration form */}
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="text"
                  label="Имя"
                  placeholder="Иван"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  leftIcon={<UserIcon className="w-5 h-5" />}
                  disabled={isLoading}
                />
                <Input
                  type="text"
                  label="Фамилия"
                  placeholder="Иванов"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  leftIcon={<UserIcon className="w-5 h-5" />}
                  disabled={isLoading}
                />
              </div>

              <Input
                type="text"
                label="Username"
                placeholder="ivan_ivanov"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                leftIcon={<UserIcon className="w-5 h-5" />}
                disabled={isLoading}
              />

              <Input
                type="text"
                label="Страна"
                placeholder="Россия"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                leftIcon={<Globe className="w-5 h-5" />}
                disabled={isLoading}
              />

              <Input
                type="email"
                label="Email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                leftIcon={<Mail className="w-5 h-5" />}
                disabled={isLoading}
              />

              <Input
                type="password"
                label="Пароль"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                leftIcon={<Lock className="w-5 h-5" />}
                disabled={isLoading}
              />

              <Input
                type="password"
                label="Подтвердите пароль"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                leftIcon={<Lock className="w-5 h-5" />}
                disabled={isLoading}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
                rightIcon={!isLoading && <ArrowRight className="w-5 h-5" />}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Регистрация...
                  </>
                ) : (
                  'Зарегистрироваться'
                )}
              </Button>
            </form>

            {message && (
              <div className={`text-sm text-center p-3 rounded-lg ${
                isSuccess 
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {message}
              </div>
            )}

            <p className="text-center text-sm text-slate-400">
              Уже есть аккаунт?{' '}
              <Link href="/login" className="text-primary-400 hover:text-primary-300 font-medium">
                Войти
              </Link>
            </p>

            <p className="text-center text-xs text-slate-500">
              При регистрации вы соглашаетесь с условиями использования сервиса
            </p>
          </CardContent>
        </Card>

        {/* Back to home */}
        <p className="text-center text-sm text-slate-500 mt-6">
          <Link href="/" className="text-primary-400 hover:text-primary-300">
            ← Вернуться на главную
          </Link>
        </p>
      </div>
    </div>
  )
}
