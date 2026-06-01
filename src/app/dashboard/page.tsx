'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { createSlug } from '../../lib/presentations'
import type { User } from '@supabase/supabase-js'


type Presentation = {
  id: string
  title: string
  slug: string
  storage_path: string
  created_at: string
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [title, setTitle] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      if (!supabase) {
        setLoading(false)
        return
      }

      const { data } = await supabase.auth.getSession()
      if (!data?.session) {
        router.replace('/login')
        return
      }

      setUser(data.session.user)
      await loadPresentations(data.session.user.id)
      setLoading(false)
    }

    init()
  }, [router])

  const loadPresentations = async (userId: string) => {
    const { data, error } = await supabase
      .from('presentations')
      .select('id, title, slug, storage_path, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      setStatus('Falha ao carregar suas apresentações.')
      return
    }

    setPresentations(data ?? [])
  }

  const isFormValid = useMemo(() => title.trim().length > 0 && pdfFile !== null, [title, pdfFile])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('')
    if (!user || !pdfFile) {
      setStatus('Preencha todos os campos e envie um PDF válido.')
      return
    }

    if (!supabase) {
      setLoading(false)
      return
    }

    setLoading(true)

    const slug = `${createSlug(title) || 'ap-da-viraweb'}-${Date.now()}`
    // Basic client-side validation
    if (pdfFile.type !== 'application/pdf') {
      setStatus('O arquivo enviado não parece ser um PDF válido.')
      setLoading(false)
      return
    }

    // Create FormData to send PDF and metadata in a single request to the API
    // Upload file directly to Supabase Storage from the browser to avoid
    // sending large multipart bodies through the Next.js API route which
    // can hit platform limits (Content Too Large / 413).
    try {
      const storagePath = `${user.id}/${slug}.pdf`

      // upload file using anon client; this requires the user to be
      // authenticated (we retrieved session earlier). This avoids the
      // Next.js route receiving the raw file.
      const { error: uploadError } = await supabase!.storage.from('presentations').upload(storagePath, pdfFile, { upsert: true })

      if (uploadError) {
        // eslint-disable-next-line no-console
        console.error('Storage upload error:', uploadError)
        setStatus('Erro ao enviar o arquivo para o storage.')
        setLoading(false)
        return
      }

      // Insert metadata row into `presentations`. RLS allows this for the
      // authenticated user (policies require auth.uid() = user_id).
      const { error: insertError } = await supabase!.from('presentations').insert({
        user_id: user.id,
        title: title.trim(),
        slug,
        storage_path: storagePath
      })

      if (insertError) {
        // eslint-disable-next-line no-console
        console.error('Database insert error:', insertError)
        setStatus('Erro ao salvar metadados da apresentação.')
        setLoading(false)
        return
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Upload/insert flow failed:', err)
      setStatus('Erro ao salvar os dados da apresentação no servidor.')
      setLoading(false)
      return
    }

    setTitle('')
    setPdfFile(null)
    setStatus('Apresentação criada com sucesso!')
    await loadPresentations(user.id)
    router.push(`/presentations/${slug}`)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.16),_transparent_30%),linear-gradient(180deg,_#f8fbff,_#eef7ff)] px-4 py-10 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 rounded-[32px] border border-slate-200/70 bg-white/90 p-8 shadow-[0_40px_120px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="AP da Viraweb" className="h-14 w-14 rounded-3xl border border-slate-200 bg-slate-50 object-cover" />
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-600">AP da Viraweb</p>
                <h1 className="text-4xl font-semibold text-slate-950">Painel de apresentações</h1>
                <p className="mt-2 text-sm text-slate-500">Faça upload de PDF e gere um link único com slug usando Supabase.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              Sair
            </button>
          </div>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[32px] border border-slate-200/70 bg-white/90 p-8 shadow-[0_35px_90px_rgba(15,23,42,0.08)]">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-600">Nova apresentação</p>
              <h2 className="text-3xl font-semibold text-slate-950">Upload de PDF</h2>
              <p className="text-sm text-slate-500">Envie seu arquivo PDF e gere automaticamente o slug e o link de apresentação.</p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <label className="block text-sm text-slate-700">
                Nome da apresentação
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-cyan-500"
                  placeholder="Ex: Planejamento de marketing"
                />
              </label>

              <label className="block text-sm text-slate-700 ">
                Arquivo PDF
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)}
                  className="mt-3 cursor-pointer w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none"
                />
              </label>

              <button
                type="submit"
                disabled={!isFormValid || loading}
                className="inline-flex w-full cursor-pointer items-center justify-center rounded-3xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Enviando...' : 'Criar apresentação'}
              </button>

              {status ? <p className="text-sm text-cyan-700">{status}</p> : null}
            </form>
          </div>

          <aside className="rounded-[32px] border border-slate-200/70 bg-white/90 p-8 shadow-[0_35px_90px_rgba(15,23,42,0.08)]">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-600">Suas apresentações</p>
              <h2 className="text-3xl font-semibold text-slate-950">Lista de slides</h2>
            </div>

            {presentations.length === 0 ? (
              <div className="mt-6 rounded-[28px] border border-dashed border-slate-200/60 bg-slate-50 p-6 text-sm text-slate-500">
                Nenhuma apresentação encontrada. Faça upload de um PDF para criar sua primeira apresentação.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {presentations.map((presentation) => (
                  <article key={presentation.id} className="rounded-[28px] border border-slate-200/70 bg-slate-50 p-5">
                    <p className="text-sm uppercase tracking-[0.28em] text-cyan-600">{presentation.title}</p>
                    <p className="mt-3 text-sm text-slate-500">Slug: <span className="font-semibold text-slate-900">{presentation.slug}</span></p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">{new Date(presentation.created_at).toLocaleString('pt-BR')}</p>
                    <div className="mt-4 flex gap-3">
                      <a
                        href={`/presentations/${presentation.slug}`}
                        className="inline-flex text-sm font-semibold text-cyan-600 transition hover:text-cyan-500"
                      >
                        Abrir apresentação
                      </a>

                      <button
                        type="button"
                        onClick={async () => {
                          // confirm delete
                          if (!confirm('Tem certeza que deseja excluir esta apresentação? Esta ação não pode ser desfeita.')) return
                          setLoading(true)
                          setStatus('Removendo apresentação...')

                          try {
                            // attempt to remove storage file first
                            try {
                              await supabase!.storage.from('presentations').remove([presentation.storage_path])
                            } catch (e) {
                              // ignore storage deletion failures, proceed to remove db row
                              // eslint-disable-next-line no-console
                              console.warn('Storage removal failed:', e)
                            }

                            const { error: deleteError } = await supabase!.from('presentations').delete().eq('id', presentation.id)
                            if (deleteError) {
                              // eslint-disable-next-line no-console
                              console.error('Delete error:', deleteError)
                              setStatus('Falha ao excluir apresentação.')
                              setLoading(false)
                              return
                            }

                            // remove from local state
                            setPresentations((prev) => prev.filter((p) => p.id !== presentation.id))
                            setStatus('Apresentação removida com sucesso.')
                          } catch (err) {
                            // eslint-disable-next-line no-console
                            console.error('Failed to delete presentation:', err)
                            setStatus('Erro ao excluir apresentação.')
                          } finally {
                            setLoading(false)
                          }
                        }}
                        className="inline-flex items-center justify-center rounded-3xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        Excluir
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  )
}
