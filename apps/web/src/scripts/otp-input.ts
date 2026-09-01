/**
 * The code boxes and the resend timer, as progressive enhancement.
 *
 * Without any of this the form still works: five inputs, type a digit in each,
 * press Verify, and Resend is a plain form post. Everything below removes taps
 * from a flow that happens while the customer is switching between the SMS app
 * and the browser, often on a slow connection.
 */

const RESEND_LOCKOUT_SECONDS = 30;

function boxesOf(fieldset: Element): HTMLInputElement[] {
  return [...fieldset.querySelectorAll('input[name="code"]')].filter(
    (node): node is HTMLInputElement => node instanceof HTMLInputElement,
  );
}

function allFilled(boxes: readonly HTMLInputElement[]): boolean {
  return boxes.every((box) => box.value.trim().length === 1);
}

export function initOtpInput(): void {
  const fieldset = document.querySelector('[data-otp]');
  if (!fieldset) return;

  const boxes = boxesOf(fieldset);
  if (boxes.length === 0) return;

  const form = fieldset.closest('form');

  /*
   * Submit as soon as the last digit lands. The customer has just read the code
   * off a notification; asking them to find a button afterwards is a wasted tap
   * and a chance to mistype.
   */
  const submitIfComplete = () => {
    if (form && allFilled(boxes)) form.requestSubmit();
  };

  boxes.forEach((box, index) => {
    box.addEventListener('input', () => {
      /* Keep digits only, so a stray character never blocks the field. */
      box.value = box.value.replace(/\D/g, '').slice(0, 1);
      if (!box.value) return;
      if (index < boxes.length - 1) boxes[index + 1]?.focus();
      else submitIfComplete();
    });

    box.addEventListener('keydown', (event) => {
      if (event.key !== 'Backspace' || box.value !== '' || index === 0) return;
      /* Backspace on an empty box steps back and clears the previous one. */
      event.preventDefault();
      const previous = boxes[index - 1];
      if (previous) {
        previous.value = '';
        previous.focus();
      }
    });

    box.addEventListener('paste', (event) => {
      const pasted = event.clipboardData?.getData('text')?.replace(/\D/g, '');
      if (!pasted) return;

      event.preventDefault();
      boxes.forEach((target, position) => {
        target.value = pasted[position] ?? target.value;
      });
      boxes[Math.min(pasted.length, boxes.length - 1)]?.focus();
      submitIfComplete();
    });
  });

  boxes[0]?.focus();
  initResendTimer();
}

/**
 * Holds Resend closed for 30 seconds with a visible countdown.
 *
 * Every resend costs the shop a real SMS, and a customer who taps it three
 * times in ten seconds has spent three of them without a code arriving any
 * sooner. The WhatsApp alternative stays available throughout — it is free, and
 * it is often the one that actually gets through.
 */
function initResendTimer(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-resend]');
  const label = document.querySelector<HTMLElement>('[data-resend-label]');
  if (!button || !label) return;

  const original = button.textContent?.trim() ?? 'Dobara bhejein';
  let remaining = RESEND_LOCKOUT_SECONDS;

  const paint = () => {
    if (remaining <= 0) {
      button.disabled = false;
      button.textContent = original;
      label.textContent = '';
      return;
    }
    button.disabled = true;
    button.textContent = original;
    /* mm:ss the way the design shows it — "0:24". */
    label.textContent = `0:${String(remaining).padStart(2, '0')}`;
    remaining -= 1;
    window.setTimeout(paint, 1000);
  };

  paint();
}
