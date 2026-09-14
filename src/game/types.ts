export type ProductCategory = 'dairy' | 'produce' | 'grocery' | 'household' | 'frozen' | 'snacks';

export interface Product {
  id: string;
  name: string;
  shortName: string;
  category: ProductCategory;
  icon: string;
  color: number;
}

export interface OrderLine {
  productId: string;
  quantity: number;
  unavailable: boolean;
}

export interface Order {
  id: number;
  lines: OrderLine[];
  timeLimitSec: number;
  shelfProductIds: string[];
}

export type Cart = Record<string, number>;

export interface Progress {
  money: number;
  rating: number;
  xp: number;
  completedOrders: number;
  bestStreak: number;
  nextOrderId: number;
}

export interface Rank {
  id: string;
  title: string;
  minXp: number;
}

export type ReviewBucket = 'excellent' | 'good' | 'neutral' | 'bad' | 'disaster';

export interface OrderResult {
  quality: number;
  exactCount: number;
  replacementCount: number;
  missingCount: number;
  extraCount: number;
  basePay: number;
  tip: number;
  fine: number;
  netPay: number;
  ratingDelta: number;
  xp: number;
  stars: number;
  bucket: ReviewBucket;
  timedOut: boolean;
}
