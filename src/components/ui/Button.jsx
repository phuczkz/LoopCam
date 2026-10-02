import { Spinner } from './Spinner'

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) {
  const baseClasses = 'relative flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 btn-press disabled:opacity-50 disabled:pointer-events-none'

  const variants = {
    primary: 'gradient-bg text-white shadow-lg shadow-accent-violet/20',
    secondary: 'glass text-white hover:bg-glass-hover',
    ghost: 'text-dark-200 hover:text-white hover:bg-dark-700',
    danger: 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
    outline: 'gradient-border text-white hover:bg-glass-white',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size={16} className="text-white" />
          <span className="opacity-70">{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
