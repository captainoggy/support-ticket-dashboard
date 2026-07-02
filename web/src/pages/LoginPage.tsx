import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

/**
 * Auth is layered on top of the public core flows: signing in as the seeded
 * admin unlocks the delete action. Demo credentials are pre-filled on purpose —
 * zero friction for reviewers.
 */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('admin@demo.dev');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const user = await login(email, password);
      toast.push('success', `Signed in as ${user.name}`);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Demo users: <code className="rounded bg-line/60 px-1">admin@demo.dev</code> or{' '}
          <code className="rounded bg-line/60 px-1">agent@demo.dev</code> — password{' '}
          <code className="rounded bg-line/60 px-1">demo1234</code>. Admins can delete tickets.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-line bg-surface p-5 shadow-xs">
        {error && (
          <p role="alert" className="rounded-lg bg-priority-high-bg px-3 py-2 text-sm text-priority-high-text">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-xs hover:border-ink-muted"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-xs hover:border-ink-muted"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-accent-strong disabled:opacity-60"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
