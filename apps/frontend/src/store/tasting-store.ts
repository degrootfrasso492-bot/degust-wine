import { create } from 'zustand';
import { Wine, TastingNote } from '@/types/api';

interface TastingState {
  activeWineIndex: number;
  wines: Wine[];
  notes: Record<string, Partial<TastingNote>>;
  syncStatus: Record<string, 'idle' | 'saving' | 'saved' | 'error'>;
  isRevealed: boolean;

  setWines: (wines: Wine[]) => void;
  setActiveWineIndex: (index: number) => void;
  updateNote: (wineId: string, patch: Partial<TastingNote>) => void;
  setSyncStatus: (wineId: string, status: 'idle' | 'saving' | 'saved' | 'error') => void;
  triggerReveal: () => void;
}

export const useTastingStore = create<TastingState>((set) => ({
  activeWineIndex: 0,
  wines: [],
  notes: {},
  syncStatus: {},
  isRevealed: false,

  setWines: (wines) => set({ wines }),
  setActiveWineIndex: (index) => set({ activeWineIndex: index }),
  updateNote: (wineId, patch) =>
    set((state) => ({
      notes: {
        ...state.notes,
        [wineId]: { ...state.notes[wineId], ...patch },
      },
    })),
  setSyncStatus: (wineId, status) =>
    set((state) => ({
      syncStatus: { ...state.syncStatus, [wineId]: status },
    })),
  triggerReveal: () => set({ isRevealed: true }),
}));
