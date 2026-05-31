 'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import BackgroundGrid from '../../components/background-grid'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const init = async () => {
      if (!supabase) return

      const { data } = await supabase.auth.getSession()
      if (data?.session) {
        router.replace('/dashboard')
      }
    }

    init()
  }, [router])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setStatus('')

    if (!email || !password) {
      setStatus('Preencha e-mail e senha.')
      setLoading(false)
      return
    }

    if (!supabase) {
      setStatus('Erro de conexão. Tente novamente mais tarde.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setStatus(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-950">
      <BackgroundGrid />
      <div className="absolute inset-0 bg-white/30 backdrop-blur-sm z-0" />
      <div className="relative z-20 mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-12">
        <div className="absolute inset-0 " />
        <div className="relative w-full rounded-[40px] border border-slate-200/70 bg-white/85 p-8 shadow-[0_45px_120px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-12">
          <div className="mx-auto max-w-3xl space-y-10">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2.5rem] border border-cyan-200/50 bg-white shadow-sm shadow-cyan-100/60">
                <Image src="/logo.png" width={48} height={48} alt="Logo Viraweb" className="h-14 w-14 object-contain" />
              </div>
              <p className="text-sm uppercase tracking-[0.32em] text-cyan-600">AP da Viraweb</p>
              <h1 className="mt-4 text-4xl font-semibold text-slate-950">Acesse seu painel</h1>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-500">
                Entre com sua conta para criar e compartilhar apresentações em PDF com um painel leve e moderno.
              </p>
            </div>

            <div className="rounded-[32px] bg-white/95 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-slate-700">
                  E-mail
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                    placeholder="seu@empresa.com"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Senha
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                    placeholder="••••••••"
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="cursor-pointer flex w-full items-center justify-center rounded-3xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Processando...' : 'Entrar'}
                </button>

                {status ? <p className="text-center text-sm text-rose-600">{status}</p> : null}
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
