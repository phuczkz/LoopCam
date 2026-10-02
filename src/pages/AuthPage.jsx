import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Camera, Eye, EyeOff, Mail, Lock, User, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    username: '',
    fullName: '',
  })

  const { signIn, signUp } = useAuth()

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        await signIn({ email: form.email, password: form.password })
        toast.success('Welcome back! 👋')
      } else {
        // Validation
        if (!form.username.trim()) {
          toast.error('Username is required')
          setLoading(false)
          return
        }
        if (form.username.trim().length < 3) {
          toast.error('Username must be at least 3 characters')
          setLoading(false)
          return
        }
        if (form.password.length < 6) {
          toast.error('Password must be at least 6 characters')
          setLoading(false)
          return
        }

        await signUp({
          email: form.email,
          password: form.password,
          username: form.username,
          fullName: form.fullName || form.username,
        })
        toast.success('Account created! 🎉')
      }
    } catch (error) {
      toast.error(error.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
      {/* Animated Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[280px] h-[280px] rounded-full bg-accent-violet/20 blur-[90px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[260px] h-[260px] rounded-full bg-accent-rose/15 blur-[90px] animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
      <div className="absolute top-[35%] right-[-15%] w-[180px] h-[180px] rounded-full bg-accent-orange/10 blur-[70px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center mb-6 animate-fade-in">
        <div className="w-18 h-18 rounded-3xl gradient-bg flex items-center justify-center shadow-xl shadow-accent-violet/30 mb-3">
          <Camera size={34} className="text-white" />
        </div>
        <h1 className="text-3xl font-extrabold gradient-text tracking-tight">LoopCam</h1>
        <p className="text-dark-300 text-xs font-medium mt-1">Share moments with closest friends</p>
      </div>

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-sm animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="glass rounded-3xl p-6 shadow-2xl border border-white/10">
          {/* Toggle */}
          <div className="flex bg-dark-800/90 rounded-2xl p-1 mb-5 border border-dark-700/60">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                isLogin
                  ? 'gradient-bg text-white shadow-md'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                !isLogin
                  ? 'gradient-bg text-white shadow-md'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {!isLogin && (
              <>
                <div className="relative flex items-center">
                  <User size={18} className="absolute left-4 text-dark-400 pointer-events-none z-10" />
                  <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    value={form.username}
                    onChange={handleChange}
                    className="w-full h-12 bg-dark-800 border border-dark-600 rounded-2xl pl-11 pr-4 text-sm text-white placeholder-dark-400 focus:outline-none focus:border-accent-violet/60 focus:ring-2 focus:ring-accent-violet/20 transition-all"
                    autoComplete="username"
                  />
                </div>
                <div className="relative flex items-center">
                  <Sparkles size={18} className="absolute left-4 text-dark-400 pointer-events-none z-10" />
                  <input
                    type="text"
                    name="fullName"
                    placeholder="Full Name"
                    value={form.fullName}
                    onChange={handleChange}
                    className="w-full h-12 bg-dark-800 border border-dark-600 rounded-2xl pl-11 pr-4 text-sm text-white placeholder-dark-400 focus:outline-none focus:border-accent-violet/60 focus:ring-2 focus:ring-accent-violet/20 transition-all"
                    autoComplete="name"
                  />
                </div>
              </>
            )}

            <div className="relative flex items-center">
              <Mail size={18} className="absolute left-4 text-dark-400 pointer-events-none z-10" />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full h-12 bg-dark-800 border border-dark-600 rounded-2xl pl-11 pr-4 text-sm text-white placeholder-dark-400 focus:outline-none focus:border-accent-violet/60 focus:ring-2 focus:ring-accent-violet/20 transition-all"
                autoComplete="email"
              />
            </div>

            <div className="relative flex items-center">
              <Lock size={18} className="absolute left-4 text-dark-400 pointer-events-none z-10" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full h-12 bg-dark-800 border border-dark-600 rounded-2xl pl-11 pr-11 text-sm text-white placeholder-dark-400 focus:outline-none focus:border-accent-violet/60 focus:ring-2 focus:ring-accent-violet/20 transition-all"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 p-1 text-dark-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Button
              type="submit"
              size="lg"
              loading={loading}
              className="w-full h-12 rounded-2xl mt-1 text-sm font-semibold shadow-lg shadow-accent-violet/20"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <p className="relative z-10 text-dark-400 text-xs mt-5 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="text-accent-violet font-semibold hover:underline cursor-pointer"
        >
          {isLogin ? 'Sign Up' : 'Sign In'}
        </button>
      </p>
    </div>
  )
}
