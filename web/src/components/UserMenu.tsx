import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthUser } from '@ticketdash/shared';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

/**
 * Avatar with the account menu: identity summary, change password, sign out.
 * Closes on outside click and Escape (returning focus to the avatar).
 */
export function UserMenu({ user, onSignOut }: { user: AuthUser; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const itemClass =
    'block w-full px-4 py-2 text-left text-sm hover:bg-page focus-visible:bg-page';

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.name}`}
        onClick={() => setOpen((current) => !current)}
        className="grid size-9 place-items-center rounded-full bg-accent text-sm font-semibold text-white shadow-xs hover:bg-accent-strong"
      >
        {initials(user.name)}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-line bg-surface py-1.5 shadow-lg"
        >
          <div className="border-b border-line px-4 pb-2.5 pt-1.5">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-ink-secondary">{user.email}</p>
            <span className="mt-1.5 inline-block rounded-full bg-line/70 px-2 py-0.5 text-xs">
              {user.role === 'ADMIN' ? 'Admin' : 'Agent'}
            </span>
          </div>
          <div className="pt-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate('/account/password');
              }}
              className={`${itemClass} text-ink`}
            >
              Change password
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              className={`${itemClass} text-danger-strong`}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
