import type { ReactNode } from 'react';

/**
 * One notification channel, as a row the owner can switch.
 *
 * A channel with no credentials on the server is shown but not switchable, with
 * the reason stated. Hiding it would be worse: he would wonder where WhatsApp
 * went, or think push was never an option.
 */

interface Props {
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  /** False when the server has no credentials for this channel. */
  available: boolean;
  unavailableReason?: string;
  busy?: boolean;
  children?: ReactNode;
}

export function ChannelRow({
  title,
  description,
  checked,
  onChange,
  available,
  unavailableReason,
  busy = false,
  children,
}: Props) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked && available}
          disabled={!available || busy}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600 disabled:opacity-40"
        />
        <span>
          <span className="block text-sm font-bold text-ink">{title}</span>
          <span className="mt-0.5 block text-sm text-ink-muted">{description}</span>
          {!available && unavailableReason && (
            <span className="mt-1 block text-xs font-medium text-amber-700">
              {unavailableReason}
            </span>
          )}
        </span>
      </label>

      {available && children && <div className="mt-3 pl-8">{children}</div>}
    </div>
  );
}
