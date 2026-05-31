import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Supabase service credentials are not configured' }, { status: 500 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const contentType = request.headers.get('content-type') || ''

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const file = form.get('file') as any
      const user_id = form.get('user_id') as string
      const title = form.get('title') as string
      const slug = form.get('slug') as string

      if (!file || !user_id || !title || !slug) {
        return NextResponse.json({ error: 'Missing form fields' }, { status: 400 })
      }

      const storagePath = `${user_id}/${slug}.pdf`

      // Convert file to Buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { error: uploadError } = await supabaseAdmin.storage.from('presentations').upload(storagePath, buffer, { upsert: true })

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message || uploadError }, { status: 500 })
      }

      const { data, error } = await supabaseAdmin.from('presentations').insert({
        user_id,
        title,
        slug,
        storage_path: storagePath
      })

      if (error) {
        return NextResponse.json({ error: error.message || error }, { status: 500 })
      }

      return NextResponse.json({ data }, { status: 200 })
    }

    // fallback: accept JSON body (legacy)
    const body = await request.json()
    const { user_id, title, slug, storage_path } = body

    const { data, error } = await supabaseAdmin.from('presentations').insert({
      user_id,
      title,
      slug,
      storage_path
    })

    if (error) {
      return NextResponse.json({ error: error.message || error }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('API /api/presentations error:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}

