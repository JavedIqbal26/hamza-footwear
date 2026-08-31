import type { ReactNode } from 'react';

/**
 * The shared controls.
 *
 * Everything here is sized for one-handed phone use: 44px minimum touch
 * targets, full-width buttons, and 16px inputs so iOS does not zoom on focus.
 */

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

const VARIANTS = {
  primary: 'bg-brand-600 text-white',
  secondary: 'bg-white text-ink border border-neutral-300',
  danger: 'bg-white text-red-700 border border-red-300',
} as const;

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 w-full rounded-lg px-4 text-base font-semibold disabled:opacity-50 ${VARIANTS[variant]}`}
    >
      {children}
    </button>
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>
      )}
    </div>
  );
}

/** 16px text is deliberate: anything smaller makes iOS zoom the page on focus. */
export const inputClass =
  'mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-base';

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
      {message}
    </p>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <p role="status" className="py-8 text-center text-sm text-ink-muted">
      {label}
    </p>
  );
}
