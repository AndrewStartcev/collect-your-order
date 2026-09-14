import { PRODUCTS } from '../data/products';
import type { Order, OrderLine, Product } from '../types';

const PRODUCTION_PRODUCT_IDS = new Set([
  'milk',
  'kefir',
  'banana',
  'apple',
  'rice',
  'paper',
  'dumplings',
  'berries',
  'chocolate',
  'detergent',
  'shampoo',
  'batteries',
]);

const PRODUCTION_PRODUCTS = PRODUCTS.filter((product) => PRODUCTION_PRODUCT_IDS.has(product.id));

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hasReplacement(product: Product): boolean {
  return PRODUCTION_PRODUCTS.some(
    (candidate) => candidate.id !== product.id && candidate.category === product.category,
  );
}

export function generateOrder(orderId: number, completedOrders: number): Order {
  const lineCount = clamp(3 + Math.floor(completedOrders / 8), 3, 5);
  const quantityMax = completedOrders >= 7 ? 2 : 1;
  const chosen = shuffle(PRODUCTION_PRODUCTS).slice(0, lineCount);

  const replaceableIndexes = chosen
    .map((product, index) => (hasReplacement(product) ? index : -1))
    .filter((index) => index >= 0);
  const unavailableIndex = completedOrders >= 3 && replaceableIndexes.length > 0 && Math.random() < 0.28
    ? replaceableIndexes[Math.floor(Math.random() * replaceableIndexes.length)]
    : -1;

  const lines: OrderLine[] = chosen.map((product, index) => ({
    productId: product.id,
    quantity: quantityMax === 1 ? 1 : Math.random() < 0.35 ? 2 : 1,
    unavailable: index === unavailableIndex,
  }));

  const shelfIds = new Set<string>();
  const blockedIds = new Set(lines.filter((line) => line.unavailable).map((line) => line.productId));

  for (const line of lines) {
    if (!line.unavailable) shelfIds.add(line.productId);
  }

  if (unavailableIndex >= 0) {
    const unavailableProduct = chosen[unavailableIndex];
    const alternatives = shuffle(
      PRODUCTION_PRODUCTS.filter(
        (product) =>
          product.category === unavailableProduct.category &&
          product.id !== unavailableProduct.id &&
          !blockedIds.has(product.id),
      ),
    );
    if (alternatives[0]) shelfIds.add(alternatives[0].id);
  }

  const distractors = shuffle(
    PRODUCTION_PRODUCTS.filter((product) => !blockedIds.has(product.id) && !shelfIds.has(product.id)),
  );
  for (const product of distractors) shelfIds.add(product.id);

  const shelfProductIds = shuffle([...shelfIds]).filter((productId) => !blockedIds.has(productId));
  const timeLimitSec = clamp(105 + lineCount * 4 - Math.floor(completedOrders / 4) * 4, 60, 115);

  return {
    id: orderId,
    lines,
    timeLimitSec,
    shelfProductIds,
  };
}
