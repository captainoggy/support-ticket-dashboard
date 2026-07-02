import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

/**
 * The whole dashboard sits behind sign-in, so this doubles as the landing
 * page: a short product pitch next to the form. Demo credentials live in the
 * README, not here — a login page must never advertise working credentials.
 */

const HIGHLIGHTS = [
  {
    title: 'One queue, no lost tickets',
    text: 'Every customer request lands in a single list with clear status and priority at a glance.',
  },
  {
    title: 'Update status in one move',
    text: 'Change status from the list, the ticket page, or by dragging cards across the Kanban board.',
  },
  {
    title: 'Always in sync',
    text: 'Live updates keep every open tab current, and filters and search are shareable as links.',
  },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const user = await login(email, password);
      toast.push('success', `Signed in as ${user.name}`);
      // Return to wherever the route guard intercepted the visitor.
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl items-center gap-10 py-6 md:grid-cols-2 md:py-12">
      {/* Pitch */}
      <div>
        <p className="text-sm font-medium text-accent">Support Desk</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight">
          Customer support tickets, from reported to resolved
        </h1>
        <p className="mt-3 text-ink-secondary">
          Track every request in one place: triage by priority, move work across the board, and
          keep the whole team looking at the same live picture.
        </p>
        <ul className="mt-6 space-y-4">
          {HIGHLIGHTS.map((item) => (
            <li key={item.title} className="flex gap-3">
              <span
                aria-hidden
                className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-accent/10 text-accent"
              >
                <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 8.5 6.5 12 13 4.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-sm text-ink-secondary">{item.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Sign-in card */}
      <div className="w-full max-w-sm space-y-4 justify-self-center md:justify-self-end">
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-xl border border-line bg-surface p-6 shadow-xs"
        >
          <div>
            <h2 className="text-lg font-semibold">Sign in</h2>
            <p className="mt-0.5 text-sm text-ink-secondary">
              Demo accounts are listed in the project README.
            </p>
          </div>
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
    </div>
  );
}
