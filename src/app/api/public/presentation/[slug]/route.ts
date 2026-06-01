import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request, context: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Supabase service credentials are not configured' }, { status: 500 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  try {
    // context.params can be an object or a Promise depending on Next.js types.
    let slug: string | undefined

    const maybeParams = context?.params
    const resolvedParams = maybeParams instanceof Promise ? await maybeParams : maybeParams
    slug = resolvedParams?.slug

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('presentations')
      .select('id, title, slug, storage_path')
      .eq('slug', slug)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Presentation not found' }, { status: 404 })
    }

    const publicUrl = supabaseAdmin.storage
      .from('presentations')
      .getPublicUrl(data.storage_path).data.publicUrl

    return NextResponse.json({ data: { ...data, publicUrl } }, { status: 200 })
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('API /api/public/presentation error:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
