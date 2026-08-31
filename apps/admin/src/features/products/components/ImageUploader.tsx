import { useRef, useState } from 'react';
import { imageUrl } from '@hamza/shared';

import { api } from '../../../lib/api-client.js';
import { compressToVariants, NotAnImageError } from '../../../lib/image-compression.js';
import { Button } from '../../../components/ui/controls.jsx';

/**
 * Product photos.
 *
 * The whole point of the storefront is showing shoes, so this is the flow that
 * matters most: tap, pick photos from the camera roll, watch them appear.
 *
 * Each photo is compressed to three WebP sizes on the device before anything is
 * uploaded — a 6MB original never touches the network. Photos are processed one
 * at a time so a mid-range Android does not run out of memory.
 */

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
}

export function ImageUploader({ images, onChange }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;

    setError(null);
    const uploaded: string[] = [];

    try {
      const list = Array.from(files);
      for (const [index, file] of list.entries()) {
        setBusy(`Preparing photo ${index + 1} of ${list.length}…`);
        const variants = await compressToVariants(file);

        setBusy(`Uploading photo ${index + 1} of ${list.length}…`);
        const { baseKey } = await api.uploadImage(variants);
        uploaded.push(baseKey);

        /*
         * Committed after each photo rather than at the end: if the connection
         * drops on photo four, the first three are still saved.
         */
        onChange([...images, ...uploaded]);
      }
    } catch (cause) {
      setError(
        cause instanceof NotAnImageError
          ? cause.message
          : 'Photo upload failed. Check your connection and try again.',
      );
    } finally {
      setBusy(null);
      /* Reset so picking the same file again still fires a change event. */
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function remove(baseKey: string): void {
    onChange(images.filter((key) => key !== baseKey));
  }

  function move(baseKey: string, direction: -1 | 1): void {
    const from = images.indexOf(baseKey);
    const to = from + direction;
    if (from === -1 || to < 0 || to >= images.length) return;

    const next = [...images];
    const [moved] = next.splice(from, 1);
    if (moved) next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-ink">Photos</h2>
        <span className="text-xs text-ink-muted">First photo is the cover</span>
      </div>

      {images.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {images.map((baseKey, index) => (
            <li key={baseKey} className="space-y-1">
              <img
                src={imageUrl(baseKey, 'thumb')}
                alt={`Product photo ${index + 1}`}
                className="aspect-square w-full rounded-lg bg-neutral-100 object-cover"
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(baseKey, -1)}
                  disabled={index === 0}
                  aria-label={`Move photo ${index + 1} earlier`}
                  className="min-h-9 flex-1 rounded border border-neutral-300 text-xs disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => move(baseKey, 1)}
                  disabled={index === images.length - 1}
                  aria-label={`Move photo ${index + 1} later`}
                  className="min-h-9 flex-1 rounded border border-neutral-300 text-xs disabled:opacity-30"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => remove(baseKey)}
                  aria-label={`Remove photo ${index + 1}`}
                  className="min-h-9 flex-1 rounded border border-red-300 text-xs text-red-700"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/*
        `capture` is deliberately absent: the owner photographs stock in batches
        and then adds them, so the camera roll is the right picker, not the
        live camera.
      */}
      <input
        ref={inputRef}
        id="photo-input"
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => void handleFiles(event.target.files)}
      />

      <Button
        variant="secondary"
        disabled={busy !== null}
        onClick={() => inputRef.current?.click()}
      >
        {busy ?? 'Add photos'}
      </Button>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
