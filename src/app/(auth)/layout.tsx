export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Troupe</h1>
          <p className="text-stone-500 mt-1">Plan trips with your people</p>
        </div>
        {children}
      </div>
    </div>
  )
}
