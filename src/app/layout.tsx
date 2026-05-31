import './globals.css'

import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin-ext'],
  weight: ['400', '700'],
  display: 'swap'
})

export const metadata = {
  title: 'AP da Viraweb',
  description: 'Painel light cyber tech para apresentações com Supabase e Glide.js',
  icons: {
    icon: '/logo.png'
  },
  themeColor: '#e8f4ff'
}

function AppLayout(props: React.PropsWithChildren) {
  return (
    <html lang="pt-BR" className={inter.className}>
      <body>{props.children}</body>
    </html>
  )
}

export default AppLayout
