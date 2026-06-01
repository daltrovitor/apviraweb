export type Presentation = {
  slug: string
  title: string
  createdAt: string
  pdfDataUrl: string
}

const STORAGE_KEY = 'viraweb-presentations'

export function createSlug(title: string) {
  // Normalize Unicode to remove diacritics (e.g. ã -> a, ç -> c)
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove combining diacritical marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function loadPresentations(): Presentation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Presentation[]
  } catch {
    return []
  }
}

export function savePresentation(presentation: Presentation) {
  const presentations = loadPresentations()
  const index = presentations.findIndex((item) => item.slug === presentation.slug)

  if (index >= 0) {
    presentations[index] = presentation
  } else {
    presentations.unshift(presentation)
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presentations))
  return presentation
}

export function getPresentation(slug: string): Presentation | undefined {
  return loadPresentations().find((presentation) => presentation.slug === slug)
}

export function generateUniqueSlug(title: string) {
  const baseSlug = createSlug(title) || `ap-da-viraweb-${Date.now()}`
  const presentations = loadPresentations()
  let slug = baseSlug
  let suffix = 1

  while (presentations.some((presentation) => presentation.slug === slug)) {
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  return slug
}
