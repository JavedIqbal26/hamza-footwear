/**
 * Cart quantity, as progressive enhancement.
 *
 * Without this, each quantity row is a select plus an "Update" button and works
 * exactly as it should. With it, changing the select submits immediately and the
 * button hides — one tap instead of two on a phone.
 *
 * The button is only hidden once this runs, so a customer whose script failed to
 * load never ends up with a control that does nothing.
 */

/**
 * `querySelector<HTMLSelectElement>` cannot be used here: this app pulls in
 * `@cloudflare/workers-types` for its D1 and R2 bindings, and that package
 * declares its own `Element` (HTMLRewriter's) whose `remove()` returns an
 * element rather than void. `HTMLSelectElement` then fails the generic's
 * `extends Element` constraint. Querying untyped and narrowing with `instanceof`
 * sidesteps the clash and is a real runtime check besides.
 */
function findSelect(form: HTMLFormElement): HTMLSelectElement | null {
  const node = form.querySelector('select[name="quantity"]');
  return node instanceof HTMLSelectElement ? node : null;
}

export function initCartQuantity(): void {
  const forms = document.querySelectorAll('[data-cart-qty]');

  for (const node of forms) {
    if (!(node instanceof HTMLFormElement)) continue;

    const select = findSelect(node);
    if (!select) continue;

    node.querySelector('[data-cart-qty-submit]')?.setAttribute('hidden', '');
    select.addEventListener('change', () => node.submit());
  }
}
