import { PRODUCTS } from '../data/products';
import type { Order, OrderLine, Product } from '../types';

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

export function generateOrder(orderId: number, completedOrders: number): Order {
  const lineCount = clamp(3 + Math.floor(completedOrders / 7), 3, 5);
  const quantityMax = completedOrders >= 8 ? 2 : 1;
  const chosen = shuffle(PRODUCTS).slice(0, lineCount);

  const unavailableIndex = completedOrders >= 3 && Math.random() < 0.28
    ? Math.floor(Math.random() * chosen.length)
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
      PRODUCTS.filter(
        (product) =>
          product.category === unavailableProduct.category &&
          product.id !== unavailableProduct.id &&
          !chosen.some((required) => required.id === product.id),
      ),
    );

    if (alternatives[0]) shelfIds.add(alternatives[0].id);
  }

  const distractors: Product[] = shuffle(
    PRODUCTS.filter((product) => !blockedIds.has(product.id) && !shelfIds.has(product.id)),
  );

  for (const product of distractors) {
    if (shelfIds.size >= 20) break;
    shelfIds.add(product.id);
  }

  const timeLimitSec = clamp(100 + lineCount * 4 - Math.floor(completedOrders / 3) * 4, 55, 110);

  return {
    id: orderId,
    lines,
    timeLimitSec,
    shelfProductIds: shuffle([...shelfIds]),
  };
}
