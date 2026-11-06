import { useRef, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { UpsertNotePayload, TastingNote } from '@/types/api';
import { useTastingStore } from '@/store/tasting-store';

export function useDebouncedSave(delayMs = 500) {
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const setSyncStatus = useTastingStore((s) => s.setSyncStatus);

  const save = useCallback(
    (wineId: string, payload: UpsertNotePayload) => {
      if (timers.current[wineId]) {
        clearTimeout(timers.current[wineId]);
      }

      setSyncStatus(wineId, 'saving');

      timers.current[wineId] = setTimeout(async () => {
        try {
          await api.post<TastingNote>('/notes/upsert', payload);
          setSyncStatus(wineId, 'saved');
        } catch (e) {
          setSyncStatus(wineId, 'error');
        }
      }, delayMs);
    },
    [delayMs, setSyncStatus],
  );

  return { save };
}
