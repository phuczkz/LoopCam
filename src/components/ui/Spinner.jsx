import { Loader2 } from 'lucide-react'

const SIZE_MAP = {
  xs: 14,
  sm: 18,
  md: 24,
  lg: 32,
  xl: 40,
}

export function Spinner({ size = 20, className = '' }) {
  const resolvedSize = typeof size === 'string' ? (SIZE_MAP[size] || parseInt(size, 10) || 20) : size

  return (
    <Loader2
      size={resolvedSize}
      className={`animate-spin text-dark-300 ${className}`}
    />
  )
}

export function FullScreenSpinner() {
  return (
    <div className="fixed inset-0 bg-dark-900 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-3 border-white/10 border-t-[#CCFF00] animate-spin" />
        <p className="text-dark-300 text-sm font-medium">Loading...</p>
      </div>
    </div>
  )
}
