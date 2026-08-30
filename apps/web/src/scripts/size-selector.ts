import { buildWhatsAppOrderLink, isUkSize } from '@hamza/shared';

/**
 * Size selection, as progressive enhancement.
 *
 * The page is already fully usable before this runs: the radios select, and the
 * WhatsApp link works with the product and price already in the message. All
 * this adds is folding the chosen size into that message, plus the foot-length
 * hint that heads off the most common cause of returns.
 *
 * Written as plain DOM code rather than a component framework: React would cost
 * ~47KB gzipped, against a 30KB budget for the whole product page.
 */

interface OrderLinkContext {
  readonly shopPhone: string;
  readonly productName: string;
  readonly productUrl: string;
  readonly pricePkr: number;
}

function readOrderContext(link: HTMLAnchorElement): OrderLinkContext | null {
  const { shopPhone, productName, productUrl, pricePkr } = link.dataset;
  if (!shopPhone || !productName || !productUrl || !pricePkr) return null;

  const price = Number.parseInt(pricePkr, 10);
  if (!Number.isSafeInteger(price)) return null;

  return { shopPhone, productName, productUrl, pricePkr: price };
}

function updateHint(hint: HTMLElement | null, input: HTMLInputElement): void {
  if (!hint) return;
  const footCm = input.dataset.footCm;
  hint.textContent = footCm
    ? `UK ${input.value} fits a foot about ${footCm} cm long.`
    : '';
}

export function initSizeSelector(): void {
  const selector = document.querySelector<HTMLFieldSetElement>('[data-size-selector]');
  const orderLink = document.querySelector<HTMLAnchorElement>('#whatsapp-order');
  if (!selector || !orderLink) return;

  const context = readOrderContext(orderLink);
  if (!context) return;

  const hint = selector.querySelector<HTMLElement>('[data-selected-size-hint]');

  selector.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !isUkSize(input.value)) return;

    orderLink.href = buildWhatsAppOrderLink({ ...context, size: input.value });
    updateHint(hint, input);
  });
}
