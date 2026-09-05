import { Button, ErrorBanner, inputClass, Spinner } from '../../components/ui/controls.jsx';
import { ChannelRow } from './components/ChannelRow.jsx';
import { useSettings } from './hooks/useSettings.js';

/**
 * How the shop hears about a new order.
 *
 * More than one channel can be on at once, and that is the recommendation
 * rather than an accident: Web Push goes through the phone's own notification
 * system, and budget Android skins are aggressive about suspending background
 * work. A second free channel means a suppressed push is never a missed order.
 *
 * WhatsApp is not on this list. Sending to it programmatically needs the
 * WhatsApp Cloud API, which needs Meta business verification, which needs the
 * NTN and registered business bank account that also blocked the payment
 * gateway. Messaging a customer *from* an order still works — that is a human
 * tapping a link, not the server sending.
 */
export function SettingsPage() {
  const {
    data,
    error,
    notice,
    saving,
    busyChannel,
    update,
    save,
    connectTelegram,
    togglePush,
  } = useSettings();

  if (!data) return <Spinner label="Loading settings…" />;

  const { notifications, available, pushDevices } = data;

  return (
    <div className="max-w-2xl space-y-4">
      <ErrorBanner message={error} />

      {notice && (
        <p role="status" className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          {notice}
        </p>
      )}

      <div>
        <h2 className="text-base font-bold text-ink">Order notifications</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Keep at least two on. Phones sometimes hold back notifications to save
          battery, and a missed order is a lost sale.
        </p>
      </div>

      <ChannelRow
        title="Phone notification"
        description={
          pushDevices > 0
            ? `On for ${pushDevices} device${pushDevices === 1 ? '' : 's'}. Add this app to your home screen so it rings like any other app.`
            : 'Rings on this phone like any other app. Free, and nothing passes through another company.'
        }
        checked={notifications.push}
        onChange={(next) => void togglePush(next)}
        available={available.push}
        unavailableReason="Not set up on the server yet — VAPID keys are missing."
        busy={busyChannel === 'push'}
      />

      <ChannelRow
        title="Telegram"
        description="Instant and free. You will need Telegram installed on your phone."
        checked={notifications.telegram}
        onChange={(next) => update({ telegram: next })}
        available={available.telegram}
        unavailableReason="Not set up on the server yet — the bot token is missing."
        busy={busyChannel === 'telegram'}
      >
        {notifications.telegramChatId ? (
          <p className="text-sm text-ink-muted">
            Connected · chat <span className="font-medium text-ink">{notifications.telegramChatId}</span>
          </p>
        ) : (
          <>
            <p className="text-sm text-ink-muted">
              Send the bot any message in Telegram first, then press Connect.
            </p>
            <div className="mt-2 sm:max-w-[220px]">
              <Button
                variant="secondary"
                disabled={busyChannel === 'telegram'}
                onClick={() => void connectTelegram()}
              >
                {busyChannel === 'telegram' ? 'Connecting…' : 'Connect Telegram'}
              </Button>
            </div>
          </>
        )}
      </ChannelRow>

      <ChannelRow
        title="Email"
        description="A written copy in your inbox. Slower to notice, but easy to search later."
        checked={notifications.email}
        onChange={(next) => update({ email: next })}
        available={available.email}
        unavailableReason="Not set up on the server yet — the Resend API key is missing."
      >
        <label className="block">
          <span className="text-xs font-medium text-ink-muted">Send to</span>
          <input
            type="email"
            className={inputClass}
            placeholder="orders@hamzafootwear.com"
            value={notifications.emailTo ?? ''}
            onChange={(event) => update({ emailTo: event.target.value || null })}
          />
        </label>
      </ChannelRow>

      <div className="sm:max-w-[220px]">
        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}
