'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Glide from '@glidejs/glide'
import '@glidejs/glide/dist/css/glide.core.min.css'
import { supabase } from '../../../lib/supabaseClient'

type Presentation = {
  id: string
  title: string
  slug: string
  storage_path: string
}

export default function PresentationPage() {
  const params = useParams()
  const slug = params?.slug as string | undefined
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [pages, setPages] = useState<string[]>([])
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [glideInstance, setGlideInstance] = useState<any>(null)

  const toggleFullscreen = async () => {
    const container = document.getElementById('presentation-container')
    if (!container) return

    if (!document.fullscreenElement) {
      try {
        await container.requestFullscreen()
        setIsFullscreen(true)
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'))
        }, 150)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error entering fullscreen:', err)
      }
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'))
      }, 150)
    }
  }

  // Handle browser back or ESC out of fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'))
      }, 150)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Load the initial presentation details
  useEffect(() => {
    if (!slug) return

    const loadPresentation = async () => {
      if (!supabase) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('presentations')
        .select('id, title, slug, storage_path')
        .eq('slug', slug)
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setPresentation(data)
      setPdfUrl(`/api/pdf?slug=${slug}`)
      setLoading(false)
    }

    loadPresentation()
  }, [slug])

  // Extract PDF pages as images on the client side using PDF.js
  useEffect(() => {
    if (!pdfUrl) return

    let active = true
    setExtracting(true)

    const loadPdfPages = async () => {
      try {
        // Load PDF.js from CDN to avoid Next.js build and worker environment issues
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('Failed to load PDF.js script'))
            document.head.appendChild(script)
          })
        }

        const pdfjsLib = (window as any).pdfjsLib
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

        const loadingTask = pdfjsLib.getDocument(pdfUrl)
        const pdf = await loadingTask.promise

        const extractedPages: string[] = []

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (!active) return
          const page = await pdf.getPage(pageNum)
          
          // Render page to canvas with high resolution scale
          const viewport = page.getViewport({ scale: 2.0 })
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          if (!context) continue

          canvas.height = viewport.height
          canvas.width = viewport.width

          const renderContext = {
            canvasContext: context,
            viewport: viewport
          }

          await page.render(renderContext).promise
          const dataUrl = canvas.toDataURL('image/png')
          extractedPages.push(dataUrl)
        }

        if (active) {
          setPages(extractedPages)
          setExtracting(false)
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error extracting PDF pages:', err)
        if (active) {
          setExtracting(false)
        }
      }
    }

    loadPdfPages()

    return () => {
      active = false
    }
  }, [pdfUrl])

  // Initialize Glide.js slideshow once pages images are loaded
  useEffect(() => {
    if (pages.length === 0) return

    const glide = new Glide('.glide', {
      type: 'slider',
      perView: 1,
      gap: 0,
      keyboard: true,
      swipeThreshold: 80,
      dragThreshold: 120
    })

    glide.mount()
    setGlideInstance(glide)

    return () => {
      glide.destroy()
      setGlideInstance(null)
    }
  }, [pages])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-16 text-slate-950">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-slate-200/70 bg-white/90 p-10 shadow-[0_35px_90px_rgba(15,23,42,0.08)]">
          <p className="text-center text-lg font-semibold">Carregando sua apresentação...</p>
        </div>
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-16 text-slate-950">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-slate-200/70 bg-white/90 p-10 shadow-[0_35px_90px_rgba(15,23,42,0.08)] text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-cyan-600">Apresentação não encontrada</p>
          <h1 className="mt-4 text-4xl font-semibold">Slug inválido</h1>
          <p className="mt-4 text-slate-500">Volte ao dashboard e crie uma nova apresentação.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.15),_transparent_20%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.16),_transparent_24%),linear-gradient(180deg,_#eef7ff,_#f8fbff)] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-10 md:px-8">
        <header className="mb-8 rounded-[32px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_35px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo Viraweb" className="h-12 w-12 rounded-3xl border border-slate-200 bg-slate-50 object-cover" />
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-600">AP da Viraweb</p>
              <h1 className="text-3xl font-semibold text-slate-950">{presentation?.title}</h1>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 sm:mt-0">
            <button
              onClick={toggleFullscreen}
              disabled={pages.length === 0}
              className="inline-flex cursor-pointer items-center justify-center rounded-3xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
            </button>
            <p className="text-sm text-slate-500">Link único: /presentations/{slug}</p>
          </div>
        </header>

        {/* Presentation Container wrapper that goes fullscreen */}
        <div id="presentation-container" className="relative flex flex-col justify-between w-full h-[calc(100vh-220px)] bg-transparent rounded-[32px] overflow-hidden">
          {pages.length === 0 || extracting ? (
            <div className="flex h-full items-center justify-center rounded-[32px] bg-white p-10 text-slate-500 shadow-md">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-600 mx-auto"></div>
                <p className="font-semibold text-lg">Extraindo imagens dos slides do PDF...</p>
              </div>
            </div>
          ) : (
            <div className="glide relative overflow-hidden bg-black flex-grow">
              <div className="glide__track h-full" data-glide-el="track">
                <ul className="glide__slides h-full">
                  {pages.map((imageSrc, idx) => (
                    <li key={idx} className="glide__slide h-full flex items-center justify-center">
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img
                          src={imageSrc}
                          alt={`Slide ${idx + 1}`}
                          className="w-full h-full object-fill"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <footer className="presentation-footer mx-auto flex max-w-7xl flex-row items-center justify-between gap-4 rounded-[32px] border border-slate-200/70 bg-white/95 px-8 py-4 text-sm text-slate-600 shadow-[0_35px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl z-20">
            <div>
              <strong className="block text-slate-950">AP da Viraweb</strong>
              <span className="text-xs text-slate-500">{presentation?.title || 'Slide show'}</span>
            </div>

            {/* Navigation buttons inside the footer */}
            {pages.length > 0 && !extracting && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => glideInstance?.go('<')}
                  disabled={!glideInstance}
                  className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Voltar
                </button>
                <button
                  onClick={() => glideInstance?.go('>')}
                  disabled={!glideInstance}
                  className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Avançar
                </button>
              </div>
            )}
          </footer>
        </div>
      </div>
    </main>
  )
}
