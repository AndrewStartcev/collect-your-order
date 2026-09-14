import { PRODUCT_BY_ID, PRODUCTS } from '../data/products';
import type { Cart, Order, OrderResult, ReviewBucket } from '../types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getBucket(quality: number): ReviewBucket {
  if (quality >= 0.9) return 'excellent';
  if (quality >= 0.72) return 'good';
  if (quality >= 0.5) return 'neutral';
  if (quality >= 0.25) return 'bad';
  return 'disaster';
}

function getStars(quality: number): number {
  if (quality >= 0.9) return 5;
  if (quality >= 0.72) return 4;
  if (quality >= 0.5) return 3;
  if (quality >= 0.25) return 2;
  return 1;
}

export function scoreOrder(order: Order, cart: Cart, timedOut: boolean): OrderResult {
  const remaining: Cart = { ...cart };
  const totalRequired = order.lines.reduce((sum, line) => sum + line.quantity, 0);

  let exactCount = 0;
  let replacementCount = 0;
  let missingCount = 0;

  for (const line of order.lines) {
    const orderedProduct = PRODUCT_BY_ID.get(line.productId);
    if (!orderedProduct) continue;

    let unitsLeft = line.quantity;

    if (!line.unavailable) {
      const exactAvailable = remaining[line.productId] ?? 0;
      const exactUsed = Math.min(exactAvailable, unitsLeft);
      exactCount += exactUsed;
      unitsLeft -= exactUsed;
      remaining[line.productId] = exactAvailable - exactUsed;
    }

    while (unitsLeft > 0) {
      const replacement = PRODUCTS.find(
        (product) =>
          product.category === orderedProduct.category &&
          product.id !== orderedProduct.id &&
          (remaining[product.id] ?? 0) > 0,
      );

      if (!replacement) break;
      remaining[replacement.id] -= 1;
      replacementCount += 1;
      unitsLeft -= 1;
    }

    missingCount += unitsLeft;
  }

  const extraCount = Object.values(remaining).reduce((sum, count) => sum + Math.max(0, count), 0);
  const earnedPoints = exactCount + replacementCount * 0.65;
  const penalty = extraCount * 0.35 + (timedOut ? totalRequired * 0.08 : 0);
  const quality = clamp((earnedPoints - penalty) / Math.max(1, totalRequired), 0, 1);

  const basePay = 60 + totalRequired * 22;
  const payForQuality = Math.round(basePay * (0.45 + quality * 0.75));
  const tip = quality >= 0.92 && Math.random() < 0.45 ? 20 + Math.floor(Math.random() * 61) : 0;
  const fine = quality < 0.35 ? Math.round(45 + (0.35 - quality) * 180) : 0;
  const netPay = payForQuality + tip - fine;

  const ratingDelta =
    quality >= 0.9 ? 0.04 :
    quality >= 0.72 ? 0.02 :
    quality >= 0.5 ? 0 :
    quality >= 0.25 ? -0.04 : -0.08;

  const xp = Math.round(55 + quality * 95 + totalRequired * 7);

  return {
    quality,
    exactCount,
    replacementCount,
    missingCount,
    extraCount,
    basePay: payForQuality,
    tip,
    fine,
    netPay,
    ratingDelta,
    xp,
    stars: getStars(quality),
    bucket: getBucket(quality),
    timedOut,
  };
}
