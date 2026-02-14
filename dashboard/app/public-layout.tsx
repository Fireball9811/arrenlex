import { ReactNode } from "react"

export default function PublicLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header simple sin sidebar */}
      <header className="h-16 bg-white shadow flex items-center justify-between px-6">
        <div className="font-semibold text-gray-700">
          Sistema Arrenlex
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
