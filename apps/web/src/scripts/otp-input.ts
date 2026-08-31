/**
 * The five code boxes, as progressive enhancement.
 *
 * Without this the form still works: five inputs, type a digit in each, submit.
 * With it, focus advances as you type, backspace steps back, and pasting the
 * whole code from an SMS fills every box at once — which is how most people
 * will actually enter it.
 */

function boxesOf(fieldset: Element): HTMLInputElement[] {
  return [...fieldset.querySelectorAll('input[name="code"]')].filter(
    (node): node is HTMLInputElement => node instanceof HTMLInputElement,
  );
}

export function initOtpInput(): void {
  const fieldset = document.querySelector('[data-otp]');
  if (!fieldset) return;

  const boxes = boxesOf(fieldset);
  if (boxes.length === 0) return;

  boxes.forEach((box, index) => {
    box.addEventListener('input', () => {
      /* Keep digits only, so a stray character never blocks the field. */
      box.value = box.value.replace(/\D/g, '').slice(0, 1);
      if (box.value && index < boxes.length - 1) boxes[index + 1]?.focus();
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
    });
  });

  boxes[0]?.focus();
}
