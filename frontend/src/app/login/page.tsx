'use client'

import { useState, useRef, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { login } from '@/lib/nexafreight/client'
import { NexaHttpError, NexaNetworkError } from '@/lib/nexafreight/errors'
import { AuthProvider, useAuthStore } from '@/store/useAuthStore'
import { getCurrentUser } from '@/lib/nexafreight/client'

// ─── Inner form (needs access to auth store context) ─────────────────────────

function LoginForm() {
  const router = useRouter()
  const { setAuth } = useAuthStore()

  const [email, setEmail] = useState('operator@nexafreight.local')
  const [password, setPassword] = useState('operator123')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [expiredNotice, setExpiredNotice] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      if (p.get('reason') === 'expired') {
        setExpiredNotice(true)
      }
    }
    emailRef.current?.focus()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // login() auto-stores the token in client.ts's module-level store
      const loginResp = await login(email.trim(), password)

      // Fetch the full user profile (UserOut shape, has id)
      const user = await getCurrentUser()

      // Persist into React context so components can read it
      setAuth(loginResp.access_token, user)

      // Redirect to the main NexaFreight dashboard
      router.push('/')
    } catch (err) {
      console.error('[NexaFreight login error]', err)
      if (err instanceof NexaHttpError && err.isUnauthorized) {
        setError('Invalid credentials. Check your email and password.')
      } else if (err instanceof NexaNetworkError) {
        const detail = err.cause instanceof Error ? err.cause.message : String(err.cause ?? '')
        setError(`Cannot reach the NexaFreight server (${detail || 'port 8000'}). Check console.`)
      } else if (err instanceof NexaHttpError) {
        setError(`Server error ${err.status}: ${err.detail}`)
      } else {
        setError('Unexpected error. Check the browser console for details.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <motion.main
        className="login-card"
        style={styles.card}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        role="main"
        aria-label="NexaFreight login"
      >
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.eyeGlyph} aria-hidden="true">
            ◈
          </div>
          <h1 style={styles.title}>NEXAFREIGHT</h1>
          <p style={styles.subtitle}>Control Tower — Operator Access</p>
          <div style={styles.divider} />
        </div>

        {expiredNotice && (
          <div
            style={{
              padding: '10px 12px',
              marginBottom: 16,
              background: 'transparent',
              border: `1px solid var(--alert-orange)`,
              borderRadius: 2,
              color: 'var(--alert-orange)',
              fontSize: 12,
              fontFamily: 'var(--font-ui)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>⚠</span>
            <span>Authentication token expired. Click Authenticate below to reconnect.</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate style={styles.form}>
          <div style={styles.fieldGroup}>
            <label htmlFor="nf-email" style={styles.label}>
              EMAIL
            </label>
            <input
              id="nf-email"
              ref={emailRef}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="operator@nexafreight.dev"
              style={styles.input}
              disabled={loading}
              aria-describedby={error ? 'nf-error' : undefined}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label htmlFor="nf-password" style={styles.label}>
              PASSWORD
            </label>
            <input
              id="nf-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              disabled={loading}
            />
          </div>

          {/* Error message */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                id="nf-error"
                role="alert"
                aria-live="assertive"
                style={styles.errorBox}
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.22 }}
              >
                <span style={styles.errorIcon} aria-hidden="true">⚠</span>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            id="nf-submit"
            type="submit"
            disabled={loading || !email || !password}
            style={{
              ...styles.button,
              opacity: loading || !email || !password ? 0.6 : 1,
              cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
            }}
            whileHover={loading ? {} : { scale: 1.02 }}
            whileTap={loading ? {} : { scale: 0.98 }}
          >
            {loading ? (
              <span style={styles.buttonLoading}>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                  style={{ display: 'inline-block' }}
                >
                  ◈
                </motion.span>
                &nbsp;AUTHENTICATING…
              </span>
            ) : (
              'AUTHENTICATE'
            )}
          </motion.button>
        </form>

        {/* Footer hint */}
        <p style={styles.hint}>
          Seeded operator account:&nbsp;
          <code style={styles.code}>operator@nexafreight.dev</code>
        </p>
      </motion.main>
    </div>
  )
}

export default function LoginPage() {
  return <LoginForm />
}

// ─── Styles (inline, using Chartroom CSS variables) ──────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--paper)',
    fontFamily: 'var(--font-ui)',
    position: 'relative',
    overflow: 'hidden',
  },

  // Flat waybill-style card with corner registration ticks (via CSS)
  card: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: 420,
    margin: '0 16px',
    padding: '40px 36px 32px',
    background: 'var(--paper)',
    border: '1px solid var(--border-hairline)',
    borderRadius: 3,
    boxShadow: 'none',
    backdropFilter: 'none',
  },

  // Header section
  header: {
    textAlign: 'center',
    marginBottom: 32,
  },

  eyeGlyph: {
    fontSize: 16,
    marginBottom: 12,
    color: 'var(--ink)',
  },

  title: {
    margin: '0 0 8px 0',
    fontSize: '20px',
    fontWeight: 500,
    letterSpacing: '-0.01em',
    color: 'var(--ink)',
    fontFamily: 'var(--font-ui)',
  },

  subtitle: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    fontWeight: 400,
    letterSpacing: '0',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-ui)',
  },

  divider: {
    height: 1,
    background: 'var(--border-hairline)',
    margin: '16px 0',
  },

  // Form
  form: {
    marginTop: 24,
  },

  fieldGroup: {
    marginBottom: 16,
  },

  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    color: 'var(--ink)',
    fontFamily: 'var(--font-ui)',
    marginBottom: 6,
    textTransform: 'uppercase',
  },

  input: {
    width: '100%',
    padding: '8px 12px',
    fontFamily: 'var(--font-ui)',
    fontSize: '13px',
    fontWeight: 400,
    color: 'var(--ink)',
    background: 'var(--paper)',
    border: '1px solid var(--border-hairline)',
    borderRadius: 2,
    boxSizing: 'border-box',
  },

  // Error box
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '10px 12px',
    background: 'transparent',
    border: '1px solid var(--oxide-risk)',
    borderRadius: 2,
    color: 'var(--oxide-risk)',
    fontSize: '12px',
    fontFamily: 'var(--font-ui)',
    lineHeight: 1.5,
    gap: 8,
  },

  errorIcon: {
    flexShrink: 0,
    marginTop: 1,
  },

  // Submit button
  button: {
    width: '100%',
    padding: '8px 16px',
    fontFamily: 'var(--font-ui)',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    color: 'var(--paper)',
    background: 'var(--cobalt)',
    border: 'none',
    borderRadius: 2,
    cursor: 'pointer',
    textTransform: 'uppercase',
    boxSizing: 'border-box',
  },

  buttonLoading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  // Footer hint
  hint: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-ui)',
    margin: '20px 0 0 0',
  },

  code: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--cobalt)',
  },
}
