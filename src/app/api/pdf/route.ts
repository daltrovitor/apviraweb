import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return new Response('Slug is required', { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response('Supabase configuration missing', { status: 500 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Fetch the presentation storage path using service role client to bypass db RLS
    const { data: presentation, error: dbError } = await supabaseAdmin
      .from('presentations')
      .select('storage_path')
      .eq('slug', slug)
      .single()

    if (dbError || !presentation) {
      return new Response('Presentation not found', { status: 404 })
    }

    // Download the PDF from storage using service role client to bypass storage RLS
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('presentations')
      .download(presentation.storage_path)

    if (downloadError || !fileData) {
      // eslint-disable-next-line no-console
      console.error('Storage download error:', downloadError)
      return new Response('Failed to download PDF from storage', { status: 500 })
    }

    // Convert to buffer and return as inline PDF stream
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="presentation.pdf"',
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('API /api/pdf error:', err)
    return new Response('Internal server error', { status: 500 })
  }
}
