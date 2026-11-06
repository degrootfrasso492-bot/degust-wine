import type { WineCategory } from '@/types/api';

/** Черновик вина в формах админки (без orderIndex/id). */
export interface WineInput {
  title: string;
  blindLabel?: string;
  category: WineCategory;
  abv?: string;
  composition?: string;
  producer?: string;
  country?: string;
  region?: string;
  aging?: string;
  methods?: string;
  description?: string;
  photoUrl?: string | null;
}

/** Черновик события дегустации в формах админки. */
export interface EventInput {
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  timezone: string;
  isBlind: boolean;
  accessPin?: string;
  coverUrl?: string | null;
}

export function emptyWine(): WineInput {
  return {
    title: '',
    blindLabel: '',
    category: 'RED',
    abv: '',
    composition: '',
    producer: '',
    country: '',
    region: '',
    aging: '',
    methods: '',
    description: '',
    photoUrl: null,
  };
}
