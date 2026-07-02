import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { ChangePasswordSchema } from '@ticketdash/shared';
import { z } from 'zod';
import { api, ApiError } from '../api/client';
import { useToast } from '../components/Toast';

// The shared schema is what the API validates; the confirm field is UI-only.
const FormSchema = ChangePasswordSchema.extend({
  confirmPassword: z.string().min(1, 'Confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

type FormValues = z.infer<typeof FormSchema>;

const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-xs hover:border-ink-muted aria-invalid:border-danger';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-danger-strong">
      {message}
    </p>
  );
}

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema) });

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await api.post<void>('/api/auth/change-password', { currentPassword, newPassword });
      toast.push('success', 'Password changed');
      navigate('/');
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        for (const detail of error.details) {
          setError(detail.field as keyof FormValues, { message: detail.message });
        }
      } else {
        toast.push('error', error instanceof ApiError ? error.message : 'Could not change password');
      }
    }
  });

  return (
    <div className="mx-auto max-w-sm space-y-5">
      <div>
        <Link to="/" className="text-sm text-ink-secondary hover:text-ink">
          ← Back to tickets
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Change password</h1>
      </div>

      <form
        onSubmit={onSubmit}
        noValidate
        className="space-y-4 rounded-xl border border-line bg-surface p-5 shadow-xs"
      >
        <div>
          <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium">
            Current password
          </label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.currentPassword)}
            aria-describedby={errors.currentPassword ? 'currentPassword-error' : undefined}
            {...register('currentPassword')}
            className={inputClass}
          />
          <FieldError id="currentPassword-error" message={errors.currentPassword?.message} />
        </div>

        <div>
          <label htmlFor="newPassword" className="mb-1 block text-sm font-medium">
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.newPassword)}
            aria-describedby={errors.newPassword ? 'newPassword-error' : undefined}
            {...register('newPassword')}
            className={inputClass}
          />
          <FieldError id="newPassword-error" message={errors.newPassword?.message} />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
            {...register('confirmPassword')}
            className={inputClass}
          />
          <FieldError id="confirmPassword-error" message={errors.confirmPassword?.message} />
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <Link to="/" className="rounded-lg px-4 py-2 text-sm font-medium text-ink-secondary hover:text-ink">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-accent-strong disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>
    </div>
  );
}
