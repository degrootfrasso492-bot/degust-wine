export type WineCategory =
  | 'RED'
  | 'WHITE'
  | 'ROSE'
  | 'SPARKLING'
  | 'FORTIFIED'
  | 'SWEET'
  | 'VODKA'
  | 'DISTILLATE'
  | 'COGNAC'
  | 'WHISKY'
  | 'TEQUILA'
  | 'GIN'
  | 'LIQUEUR';
export type Role = 'ADMIN' | 'USER';
export type DescriptorType = 'AROMA' | 'FLAVOUR';
export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed';
export type EventPhase = 'UPCOMING' | 'OPEN' | 'CLOSED';

export interface User {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  role: Role;
}

export interface AttributeScale {
  id: string;
  slug: string;
  labelRu: string;
  minVal: number;
  maxVal: number;
  sortOrder: number;
}

export interface ScalePreset {
  id: string;
  category: WineCategory;
  name: string;
  scales: { id: string; scaleId: string; sortOrder: number; scale: AttributeScale }[];
}

export interface Wine {
  id: string;
  eventId: string;
  orderIndex: number;
  title?: string;
  blindLabel?: string;
  category: WineCategory;
  abv?: number;
  composition?: string;
  producer?: string;
  country?: string;
  region?: string;
  aging?: string;
  methods?: string;
  description?: string;
  photoUrl?: string;
}

export interface TastingEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  isClosed: boolean;
  isBlind: boolean;
  qrSlug: string;
  coverUrl?: string;
  wines: Wine[];
  phase?: EventPhase;
  timezone?: string;
  isManuallyOpen?: boolean;
}

/** Карточка дегустации: открывается из ленты, доступна гостю без входа. */
export interface EventCardSummary {
  id: string;
  title: string;
  description: string | null;
  date: string;
  timezone: string;
  coverUrl: string | null;
  isBlind: boolean;
  phase: EventPhase;
  isManuallyOpen: boolean;
  isClosed: boolean;
  creatorId: string;
  wineCount: number;
  scales: AttributeScale[];
}

export interface EventCard {
  event: EventCardSummary;
  wines: Wine[];
  results: EventAnalytics | null;
}

/** Дегустация в разделе «Дегустации» личного кабинета. */
export interface VisitedEvent {
  id: string;
  title: string;
  date: string;
  timezone: string;
  coverUrl: string | null;
  isClosed: boolean;
  isManuallyOpen: boolean;
  wineCount: number;
  phase: EventPhase;
}

export interface FeedTopWine {
  wineId: string;
  title: string;
  photoUrl: string | null;
  category: WineCategory;
  likeCount: number;
}

export interface FeedEvent {
  id: string;
  title: string;
  date: string;
  timezone: string;
  coverUrl: string | null;
  phase: EventPhase;
  wineCount: number;
  topWines: FeedTopWine[];
}

export interface FeedPage {
  items: FeedEvent[];
  total: number;
  page: number;
  limit: number;
}

export interface WsetDescriptor {
  id: string;
  parentId?: string;
  category: string;
  labelRu: string;
  labelEn?: string;
  wineType: WineType;
  level: number;
  sortOrder: number;
  children?: WsetDescriptor[];
}

export interface NoteScoreValue {
  attributeName: string;
  score: number;
}

export interface NoteDescriptor {
  descriptorId: string;
  type: DescriptorType;
  descriptor?: WsetDescriptor;
}

export interface TastingNote {
  id: string;
  userId: string;
  wineId: string;
  isLiked: boolean;
  comment?: string;
  scoreValues: NoteScoreValue[];
  descriptors: NoteDescriptor[];
}

export interface TastingNoteWithWine extends TastingNote {
  wine: Wine & {
    event: Pick<TastingEvent, 'id' | 'title' | 'date' | 'isClosed'>;
  };
}

export interface UpsertNotePayload {
  wineId: string;
  isLiked?: boolean;
  comment?: string;
  scores?: NoteScoreValue[];
  descriptors?: { descriptorId: string; type: DescriptorType }[];
}

// Analytics
export interface AttributeAverage {
  attributeName: string;
  labelRu: string;
  maxVal: number;
  average: number;
}

export interface TopDescriptor {
  descriptorId: string;
  labelRu: string;
  count: number;
  type: DescriptorType;
}

export interface WineAnalytics {
  wineId: string;
  orderIndex: number;
  title: string;
  blindLabel: string | null;
  photoUrl: string | null;
  category: WineCategory;
  producer: string | null;
  country: string | null;
  region: string | null;
  abv: number | null;
  composition: string | null;
  aging: string | null;
  methods: string | null;
  description: string | null;
  likeCount: number;
  noteCount: number;
  attributeAverages: AttributeAverage[];
  topAromaDescriptors: TopDescriptor[];
  topFlavourDescriptors: TopDescriptor[];
}

export interface EventAnalytics {
  eventId: string;
  totalParticipants: number;
  wines: WineAnalytics[];
  globalTopAroma: TopDescriptor[];
  globalTopFlavour: TopDescriptor[];
}

// Export
export interface ExportJobStatus {
  jobId: string;
  status: JobStatus;
  format: 'pdf' | 'excel';
  createdAt: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Catalog
export interface CatalogAppearance {
  eventId: string;
  title: string;
  date: string;
  likeCount: number;
}

export interface CatalogWine {
  key: string;
  title: string;
  photoUrl: string | null;
  category: WineCategory;
  producer: string | null;
  country: string | null;
  region: string | null;
  abv: number | null;
  composition: string | null;
  aging: string | null;
  methods: string | null;
  description: string | null;
  appearanceCount: number;
  likeCount: number;
  averageLikeCount: number;
  attributeAverages: AttributeAverage[];
  topAromaDescriptors: TopDescriptor[];
  topFlavourDescriptors: TopDescriptor[];
  appearances: CatalogAppearance[];
  latestDate: string;
}

export interface CatalogResponse {
  items: CatalogWine[];
  countries: string[];
  total: number;
}

export type WineType = 'WINE' | 'SPIRIT';
export type CatalogSort = 'likes' | 'newest';
