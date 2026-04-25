import dynamic from 'next/dynamic'

export const revalidate = 0

const AppContent = dynamic(() => import('./sections/AppContent'), { ssr: false })

export default function Page() {
  return <AppContent />
}
