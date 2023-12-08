import { ReactNode } from 'react'

const Layout = ({ children }: { children: ReactNode }) => {
  return <div className="min-h-screen bg-gray-50 py-12">{children}</div>
}

export default Layout
