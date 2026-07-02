import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { BoardPage } from './pages/BoardPage';
import { LoginPage } from './pages/LoginPage';
import { NewTicketPage } from './pages/NewTicketPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { TicketListPage } from './pages/TicketListPage';
import { useTicketEvents } from './realtime/useTicketEvents';

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-line/70 text-ink' : 'text-ink-secondary hover:text-ink'
  }`;
}

export function App() {
  const { user, logout } = useAuth();
  useTicketEvents();

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to content
      </a>

      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-accent text-sm font-bold text-white">
              S
            </span>
            Support Desk
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Tickets
            </NavLink>
            <NavLink to="/board" className={navLinkClass}>
              Board
            </NavLink>
          </nav>
          <div className="ms-auto flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden text-sm text-ink-secondary sm:inline">
                  {user.name}
                  <span className="ms-1.5 rounded-full bg-line/70 px-2 py-0.5 text-xs">
                    {user.role === 'ADMIN' ? 'Admin' : 'Agent'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="text-sm font-medium text-ink-secondary hover:text-ink"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/login" className="text-sm font-medium text-ink-secondary hover:text-ink">
                Sign in
              </Link>
            )}
            <Link
              to="/tickets/new"
              className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white shadow-xs hover:bg-accent-strong"
            >
              New ticket
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<TicketListPage />} />
          <Route path="/board" element={<BoardPage />} />
          <Route path="/tickets/new" element={<NewTicketPage />} />
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>
    </div>
  );
}
