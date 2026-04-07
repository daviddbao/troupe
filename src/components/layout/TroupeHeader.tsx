import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Settings, ArrowLeft } from 'lucide-react'

interface Props {
  showBack?: boolean
  backHref?: string
  title?: string
  subtitle?: string
}

export default async function TroupeHeader({ showBack = false, backHref = '/dashboard', title, subtitle }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user?.id || '')
    .single()

  const displayName = profile?.full_name || user?.email || 'User'

  return (
    <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {showBack && (
          <Link href={backHref} className="text-stone-400 hover:text-stone-900 transition">
            <ArrowLeft size={20} />
          </Link>
        )}
        <div>
          {title && (
            <>
              <h1 className="font-semibold">{title}</h1>
              {subtitle && <p className="text-xs text-stone-400">{subtitle}</p>}
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-stone-600">{displayName}</span>
        <Link href="/account" className="text-stone-400 hover:text-stone-900 transition">
          <Settings size={18} />
        </Link>
      </div>
    </nav>
  )
}
