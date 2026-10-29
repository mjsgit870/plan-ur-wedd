import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Heart, UserPlus, LogIn } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import {
  loginSchema,
  registerSchema,
  type LoginFormValues,
  type RegisterFormValues,
} from '../../lib/schemas'

function getAuthErrorMessage(message?: string): string {
  if (!message) return 'Terjadi kesalahan saat otentikasi.'

  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) {
    return 'Email atau kata sandi salah. Silakan periksa kembali.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.'
  }
  if (lower.includes('user already registered') || lower.includes('already registered')) {
    return 'Email sudah terdaftar. Silakan masuk menggunakan akun tersebut.'
  }
  if (lower.includes('password should be at least')) {
    return 'Kata sandi minimal 6 karakter.'
  }
  if (lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Terlalu banyak percobaan. Harap tunggu beberapa saat lagi.'
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Gagal terhubung ke server. Periksa koneksi internet Anda.'
  }

  return message
}

export function AuthScreen() {
  const [isRegister, setIsRegister] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [infoMsg, setInfoMsg] = React.useState<string | null>(null)

  // Login Form
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    reset: resetLogin,
    formState: { errors: loginErrors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  })

  // Register Form
  const {
    register: registerRegister,
    handleSubmit: handleRegisterSubmit,
    reset: resetRegister,
    formState: { errors: registerErrors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  })

  const onLogin = async (values: LoginFormValues) => {
    setErrorMsg(null)
    setInfoMsg(null)
    setLoading(true)

    try {
      const input = values.identifier.trim()
      let loginEmail = input

      // If identifier does not contain @, resolve username to email via profiles table
      if (!input.includes('@')) {
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', input.toLowerCase())
          .maybeSingle()

        if (profileErr || !profile?.email) {
          setErrorMsg('Username tidak ditemukan. Periksa kembali atau gunakan email.')
          setLoading(false)
          return
        }
        loginEmail = profile.email
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: values.password,
      })
      if (error) throw error
    } catch (err: unknown) {
      const error = err as { message?: string }
      setErrorMsg(getAuthErrorMessage(error.message))
    } finally {
      setLoading(false)
    }
  }

  const onRegister = async (values: RegisterFormValues) => {
    setErrorMsg(null)
    setInfoMsg(null)
    setLoading(true)

    try {
      const username = values.username.trim().toLowerCase()
      const email = values.email.trim().toLowerCase()

      // Check if username already taken in profiles
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()

      if (existingUser) {
        setErrorMsg('Username sudah digunakan. Silakan pilih username lain.')
        setLoading(false)
        return
      }

      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password: values.password,
        options: {
          data: {
            username,
          },
        },
      })
      if (error) throw error

      // Fallback insert to profiles table
      if (signUpData.user) {
        await supabase.from('profiles').upsert({
          id: signUpData.user.id,
          username,
          email,
        })
      }

      setInfoMsg('Pendaftaran berhasil! Silakan masuk menggunakan username atau email Anda.')
      setIsRegister(false)
      resetRegister()
      resetLogin({ identifier: username, password: '' })
    } catch (err: unknown) {
      const error = err as { message?: string }
      setErrorMsg(getAuthErrorMessage(error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mb-3 border border-rose-100">
            <Heart className="w-6 h-6 fill-current" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Rencanakan
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Platform Perencanaan Pernikahan Kolaboratif Pasangan
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
            {infoMsg}
          </div>
        )}

        {isRegister ? (
          /* Register Form */
          <form onSubmit={handleRegisterSubmit(onRegister)} noValidate className="space-y-4">
            <Input
              label="Username"
              type="text"
              placeholder="contoh: farhan_wedding"
              {...registerRegister('username')}
              error={registerErrors.username?.message}
            />

            <Input
              label="Email"
              type="email"
              placeholder="nama@email.com"
              {...registerRegister('email')}
              error={registerErrors.email?.message}
            />

            <Input
              label="Kata Sandi"
              type="password"
              placeholder="Minimal 6 karakter"
              {...registerRegister('password')}
              error={registerErrors.password?.message}
            />

            <Button type="submit" className="w-full gap-2" loading={loading}>
              <UserPlus className="w-4 h-4" /> Daftar Akun Baru
            </Button>
          </form>
        ) : (
          /* Login Form */
          <form onSubmit={handleLoginSubmit(onLogin)} noValidate className="space-y-4">
            <Input
              label="Username atau Email"
              type="text"
              placeholder="farhan_wedding atau nama@email.com"
              {...registerLogin('identifier')}
              error={loginErrors.identifier?.message}
            />

            <Input
              label="Kata Sandi"
              type="password"
              placeholder="Minimal 6 karakter"
              {...registerLogin('password')}
              error={loginErrors.password?.message}
            />

            <Button type="submit" className="w-full gap-2" loading={loading}>
              <LogIn className="w-4 h-4" /> Masuk ke Akun
            </Button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister)
              setErrorMsg(null)
              setInfoMsg(null)
              resetLogin()
              resetRegister()
            }}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
          >
            {isRegister
              ? 'Sudah punya akun? Masuk di sini'
              : 'Belum punya akun? Daftar gratis'}
          </button>
        </div>
      </div>
    </div>
  )
}
