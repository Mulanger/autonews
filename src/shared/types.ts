export interface WhaleDto {
  id: string;
  tier?: string;
  side: 'BUY' | 'SELL';
  outcome: string;
  usdSize: number;
  shares: number;
  priceCents: number;
  priceMillicents?: number;
  timestamp: number;
  market?: {
    conditionId?: string;
    slug?: string;
    title?: string;
    category?: string | null;
    polymarketUrl?: string | null;
    image?: string | null;
    imageUrl?: string | null;
    icon?: string | null;
    iconUrl?: string | null;
  };
  trader?: {
    proxyWallet?: string;
    pseudonym?: string | null;
    displayName?: string | null;
    profileImage?: string | null;
  };
  transactionHash?: string;
  polymarketUrl?: string;
}

export interface ResolutionEventPayload {
  type: 'resolved' | 'invalid';
  conditionId: string;
  slug: string;
  winningOutcome: 'YES' | 'NO' | null;
  resolvedAt: number | null;
  finalYesPriceCents: number | null;
  finalNoPriceCents: number | null;
}

export interface TradeOutcomeDoc {
  _id: string;
  conditionId: string;
  proxyWallet: string;
  side: 'BUY' | 'SELL';
  outcome: 'YES' | 'NO';
  outcomeIndex: number;
  shares: number;
  usdSize: number;
  entryPriceCents: number;
  timestamp: number;
  status: 'open' | 'resolved_win' | 'resolved_loss' | 'invalid';
  winningOutcome: 'YES' | 'NO' | null;
  winningOutcomeIndex: number | null;
  payoutUsd: number | null;
  pnlUsd: number | null;
  resolvedAt: Date | null;
  firstMaterializedAt: Date;
  frozenAt: Date | null;
}

export type ArticleKind = 'whale_trade' | 'whale_loss';
export type ArticleStatus = 'generating' | 'published' | 'failed';

export interface ArticleFactSet {
  tradeId: string;
  conditionId: string | null;
  marketSlug: string | null;
  marketTitle: string;
  side: 'BUY' | 'SELL';
  outcome: string;
  amountUsd: number;
  shares: number;
  priceCents: number | null;
  timestamp: number;
  wallet: string;
  traderName: string;
  transactionHash: string | null;
  polymarketUrl: string | null;
  category: string | null;
  marketImageUrl?: string | null;
  lossUsd?: number;
  pnlUsd?: number | null;
  payoutUsd?: number | null;
  winningOutcome?: 'YES' | 'NO' | null;
  resolvedAt?: number | null;
}

export interface ArticleEvent {
  kind: ArticleKind;
  triggerKey: string;
  slug: string;
  source: 'redis' | 'backfill' | 'hook';
  facts: ArticleFactSet;
}

export interface ArticleDraft {
  title: string;
  dek: string;
  body: string[];
  tags: string[];
}

export interface ArticleImage {
  url: string;
  alt: string;
  width: number;
  height: number;
  mimeType: string;
  credit: string;
}

export interface ArticleSourceLink {
  label: string;
  url: string;
  kind: 'polywhale' | 'polymarket' | 'polygonscan';
}

export interface ArticleByline {
  name: string;
  url: string;
  type: 'Organization' | 'Person';
}

export interface ArticleQuality {
  score: number;
  reasons: string[];
  clusterKey: string;
  eventAgeHours: number;
}

export interface NewsArticleDoc {
  _id: string;
  slug: string;
  triggerKey: string;
  kind: ArticleKind;
  status: ArticleStatus;
  title: string;
  dek: string;
  body: string[];
  tags: string[];
  canonicalUrl: string;
  facts: ArticleFactSet;
  image?: ArticleImage;
  sourceLinks?: ArticleSourceLink[];
  byline?: ArticleByline;
  editorialDisclosure?: string;
  quality?: ArticleQuality;
  source: ArticleEvent['source'];
  ai: {
    provider: 'minimax' | 'template';
    model: string;
    usedFallback: boolean;
    error?: string;
  };
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
