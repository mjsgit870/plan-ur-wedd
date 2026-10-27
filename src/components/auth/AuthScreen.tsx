import * as React from 'react'
import { Heart, UserPlus, LogIn } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export function AuthScreen() {
  const [isRegister, setIsRegister] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [infoMsg, setInfoMsg] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setInfoMsg(null)

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setInfoMsg('Pendaftaran berhasil! Silakan cek email Anda untuk konfirmasi akun.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      setErrorMsg(error.message || 'Terjadi kesalahan saat otentikasi.')
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Kata Sandi"
            type="password"
            placeholder="Minimal 6 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" className="w-full gap-2" loading={loading}>
            {isRegister ? (
              <>
                <UserPlus className="w-4 h-4" /> Daftar Akun Baru
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Masuk ke Akun
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister)
              setErrorMsg(null)
              setInfoMsg(null)
            }}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
          >
            {isRegister
              ? 'Sudah punya akun? Masuk di sini'
              : 'Belum punya akun? Buat akun sekarang'}
          </button>
        </div>
      </div>
    </div>
  )
}
