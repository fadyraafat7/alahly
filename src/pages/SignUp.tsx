import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { passwordResetUrl, submitWordPressPost } from '../api/auth'
import { ErrorState } from '../components/common/ErrorState'
import { useRegistrationSettings } from '../hooks/useRegistrationSettings'
import { useAuth } from '../store/AuthContext'

const inputClass = 'mt-2 w-full rounded-xl border border-ink/15 px-4 py-3 font-normal outline-moss'

export function SignUp() {
  const { register, isAuthenticated, isLoading } = useAuth()
  const settings = useRegistrationSettings()
  const [params] = useSearchParams()
  const returnTo = params.get('returnTo') || '/my-account'
  const loginUrl = `/login?${new URLSearchParams({ returnTo })}`
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting || !settings.data?.enabled) return
    const form = event.currentTarget
    const fields = new FormData(form)
    const password = String(fields.get('password') ?? '')
    setError('')
    if (!settings.data.generate_password && password !== fields.get('confirm_password')) {
      setError('Your passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      const result = await register({
        first_name: String(fields.get('first_name')).trim(),
        last_name: String(fields.get('last_name')).trim(),
        email: String(fields.get('email')).trim(),
        ...(!settings.data.generate_username && { username: String(fields.get('username')).trim() }),
        ...(!settings.data.generate_password && { password }),
      })
      form.reset()
      if (result.authenticated) {
        setSuccess('Your account has been created. Taking you to your account...')
        submitWordPressPost('alahly_spa_auth_handoff', { token: result.token, return_to: returnTo })
      } else {
        setSuccess(result.message)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create your account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (isAuthenticated && !submitting && !success) return <Navigate to="/my-account" replace />

  return (
    <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-9">
        <UserPlus className="text-moss" aria-hidden="true" />
        <p className="mt-5 text-xs font-bold uppercase tracking-widest text-clay">Customer account</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Create an account</h1>
        <p className="mt-3 text-sm leading-6 text-ink/65">Keep track of your orders and make yourself at home.</p>

        {isLoading || settings.isPending ? (
          <p className="py-8 text-sm text-ink/65" role="status">Loading account options...</p>
        ) : settings.isError ? (
          <div className="mt-6"><ErrorState title="Sign-up unavailable" message="We couldn't load registration. Please try again." onRetry={() => void settings.refetch()} /></div>
        ) : !settings.data.enabled ? (
          <p className="mt-6 rounded-xl bg-sand p-4 text-sm" role="status">New account registration is currently unavailable. Existing customers can still sign in.</p>
        ) : success ? (
          <p className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-900" role="status">{success}</p>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-5" aria-busy={submitting}>
            <fieldset disabled={submitting} className="space-y-5 disabled:opacity-60">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-bold">First name<input name="first_name" required maxLength={50} autoComplete="given-name" className={inputClass} /></label>
                <label className="block text-sm font-bold">Last name<input name="last_name" required maxLength={50} autoComplete="family-name" className={inputClass} /></label>
              </div>
              <label className="block text-sm font-bold">Email address<input name="email" required type="email" maxLength={100} autoComplete="email" className={inputClass} /></label>
              {!settings.data.generate_username && <label className="block text-sm font-bold">Username<input name="username" required maxLength={60} autoComplete="username" className={inputClass} /></label>}
              {settings.data.generate_password ? (
                <p className="rounded-xl bg-sand p-4 text-sm leading-6">We'll email you a link to set your password. Use an email address you can access.</p>
              ) : (
                <>
                  <label className="block text-sm font-bold">Password<input name="password" required type="password" minLength={12} maxLength={128} autoComplete="new-password" aria-describedby="password-help" className={inputClass} /></label>
                  <p id="password-help" className="text-xs text-ink/65">Use 12–128 characters. A long, unique passphrase works well.</p>
                  <label className="block text-sm font-bold">Confirm password<input name="confirm_password" required type="password" minLength={12} maxLength={128} autoComplete="new-password" className={inputClass} /></label>
                </>
              )}
              <button type="submit" className="w-full rounded-full bg-moss px-5 py-3 text-sm font-bold text-white hover:bg-ink disabled:cursor-wait" disabled={submitting}>
                {submitting ? 'Creating your account...' : 'Create account'}
              </button>
            </fieldset>
            {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800"><p>{error}</p><a href={passwordResetUrl} className="mt-2 inline-block font-bold underline">Reset an existing account's password</a></div>}
          </form>
        )}
        <p className="mt-7 text-center text-sm text-ink/65">Already have an account? <Link to={loginUrl} className="font-bold text-moss underline">Sign in</Link></p>
      </div>
    </main>
  )
}
