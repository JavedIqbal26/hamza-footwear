import { UK_SIZES, type UkSize } from '@hamza/shared';

/**
 * Which UK sizes this product comes in.
 *
 * A grid of toggles rather than a multi-select: on a phone, a native
 * multi-select is close to unusable, and the owner is picking six or seven of
 * twenty options.
 */

interface Props {
  selected: readonly UkSize[];
  onChange: (sizes: UkSize[]) => void;
}

export function SizePicker({ selected, onChange }: Props) {
  function toggle(size: UkSize): void {
    onChange(
      selected.includes(size)
        ? selected.filter((value) => value !== size)
        : [...selected, size],
    );
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">Sizes available (UK)</legend>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {UK_SIZES.map((size) => {
          const isSelected = selected.includes(size);
          return (
            <button
              key={size}
              type="button"
              onClick={() => toggle(size)}
              aria-pressed={isSelected}
              className={`min-h-11 rounded-lg border text-sm font-medium ${
                isSelected
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-neutral-300 bg-white text-ink'
              }`}
            >
              {size}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
