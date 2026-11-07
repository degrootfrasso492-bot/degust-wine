import { useRef, useCallback, useEffect } from 'react';
import { api, API_URL } from '@/lib/api-client';
import { UpsertNotePayload, TastingNote } from '@/types/api';
import { useTastingStore } from '@/store/tasting-store';

export function useDebouncedSave(delayMs = 500) {
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pending = useRef<Record<string, UpsertNotePayload>>({});
  const setSyncStatus = useTastingStore((s) => s.setSyncStatus);

  const send = useCallback(
    async (wineId: string, payload: UpsertNotePayload) => {
      try {
        await api.post<TastingNote>('/notes/upsert', payload);
        setSyncStatus(wineId, 'saved');
      } catch {
        setSyncStatus(wineId, 'error');
      }
    },
    [setSyncStatus],
  );

  /** Немедленно отправляет отложенное сохранение для одного вина. */
  const flushOne = useCallback(
    (wineId: string) => {
      const payload = pending.current[wineId];
      if (!payload) return;

      delete pending.current[wineId];
      if (timers.current[wineId]) {
        clearTimeout(timers.current[wineId]);
        delete timers.current[wineId];
      }
      void send(wineId, payload);
    },
    [send],
  );

  /** Отправляет все отложенные сохранения (или одно конкретное). */
  const flush = useCallback(
    (wineId?: string) => {
      if (wineId) {
        flushOne(wineId);
        return;
      }
      for (const id of Object.keys(pending.current)) {
        flushOne(id);
      }
    },
    [flushOne],
  );

  const save = useCallback(
    (wineId: string, payload: UpsertNotePayload) => {
      if (timers.current[wineId]) {
        clearTimeout(timers.current[wineId]);
      }

      pending.current[wineId] = payload;
      setSyncStatus(wineId, 'saving');

      timers.current[wineId] = setTimeout(() => {
        delete timers.current[wineId];
        const latest = pending.current[wineId];
        if (!latest) return;
        delete pending.current[wineId];
        void send(wineId, latest);
      }, delayMs);
    },
    [delayMs, send, setSyncStatus],
  );

  // При размонтировании (переход «Назад», смена вкладки, закрытие карточки)
  // не теряем последнюю правку: таймер сбрасывается, но данные уходят сразу.
  useEffect(() => {
    const handleBeforeUnload = () => {
      for (const [wineId, payload] of Object.entries(pending.current)) {
        // keepalive позволяет запросу пережить выгрузку страницы.
        void fetch(`${API_URL}/api/notes/upsert`, {
          method: 'POST',
          credentials: 'include',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => undefined);
        delete pending.current[wineId];
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flush();
    };
  }, [flush]);

  return { save, flush };
}
