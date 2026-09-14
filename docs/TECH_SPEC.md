# TECH SPEC — prototype

## Runtime

- Phaser `4.2.1`
- Vite `8.x`
- TypeScript `7.x`
- Browser-first, no React
- Base resolution `1600×900`
- `Phaser.Scale.FIT` + `CENTER_BOTH`

## Architecture

```text
src/
  main.ts
  style.css
  game/
    config.ts
    types.ts
    scenes/
      GameScene.ts
    data/
      products.ts
      ranks.ts
      reviews.ts
    services/
      order-generator.ts
      scoring.ts
      save.ts
```

Prototype deliberately uses one Phaser scene. Splitting into Boot/Menu/Game/Result scenes before the gameplay is validated would add structure without product value.

## Data model

### Product

```ts
interface Product {
  id: string;
  name: string;
  shortName: string;
  category: ProductCategory;
  icon: string;
  color: number;
}
```

### Order line

```ts
interface OrderLine {
  productId: string;
  quantity: number;
  unavailable: boolean;
}
```

### Order

```ts
interface Order {
  id: number;
  lines: OrderLine[];
  timeLimitSec: number;
}
```

### Cart

`Record<productId, quantity>`.

### Progress

```ts
interface Progress {
  money: number;
  rating: number;
  xp: number;
  completedOrders: number;
  bestStreak: number;
  nextOrderId: number;
}
```

## Order generation

Difficulty grows from completed order count, not from handcrafted levels.

Initial prototype:

- 3 lines at start;
- later 4–5 lines;
- quantity mostly 1, later 2–3;
- 0–1 unavailable exact products;
- shelf contains required products, valid category alternatives and distractors;
- 20 visible product cards.

The generator must guarantee that an order is mechanically solvable: every available exact item is present on the shelf and an unavailable line has at least one same-category replacement.

## Scoring

For each required unit:

- exact item: `1.0` quality point;
- same-category replacement: `0.65`;
- missing: `0`.

Penalties:

- extra unrelated unit: `-0.35`;
- extra same-category unit: `-0.15`;
- timeout: additional small penalty.

Final quality is clamped to `0..1`.

Prototype economy:

- base pay depends on order size;
- quality multiplies pay;
- high quality may add tips;
- very poor quality may produce a fine;
- rating moves gradually instead of jumping dramatically;
- XP rewards completed work and quality.

Exact values are implementation details and can be tuned after first hands-on test.

## Reviews

Review selection is data-driven by quality bucket:

- excellent;
- good;
- neutral;
- bad;
- disaster.

Reviews are short. They are gameplay feedback, not decorative copy.

## Save

LocalStorage key: `collect-your-order:v1`.

Save after every completed order. Corrupt/unknown data falls back to safe defaults.

## Input

- click/tap product card → add one unit to cart;
- click/tap cart item → remove one unit;
- submit button → evaluate immediately;
- after result only «Следующий заказ» starts the next order.

No drag and drop in prototype. It adds friction and mobile edge cases without improving the core decision.

## Prototype visual rules

Before art production use generated rectangles/text/icons only. No placeholder image files that could accidentally survive into production.

Required feedback:

- product card press animation;
- selected count badge;
- brief fly/tween toward cart;
- cart change animation;
- timer danger state;
- result card transition;
- money/rating/XP delta.

## Validation checkpoint

Before production assets the manager tests the prototype and answers only product-level questions:

1. Is finding and selecting products immediately understandable?
2. Does sending an imperfect order feel interesting rather than merely wrong?
3. Is the review/result satisfying enough to make the next order desirable?
4. Is the screen readable at normal browser size?

Only after this checkpoint create `ART_BIBLE.md` and `ASSET_MANIFEST.md`.
