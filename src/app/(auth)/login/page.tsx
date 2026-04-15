'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      router.push('/inbox')
      router.refresh()
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon" style={{ fontSize: '10px' }}>RC</div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            React Commerce
          </span>
        </div>

        <h1>Welcome back</h1>
        <p>Sign in to your workspace</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
          Need an account? Ask your workspace admin.
        </p>
      </div>
    </div>
  )
}