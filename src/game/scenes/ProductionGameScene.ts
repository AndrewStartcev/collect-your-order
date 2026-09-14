import Phaser from 'phaser';
import { PRODUCT_BY_ID } from '../data/products';
import { getNextRank, getRank } from '../data/ranks';
import { pickReview } from '../data/reviews';
import { generateOrder } from '../services/order-generator';
import { scoreOrder } from '../services/scoring';
import { loadProgress, saveProgress } from '../services/save';
import type { Cart, Order, OrderResult, Progress } from '../types';

const COLORS = {
  navy: 0x12243a,
  navySoft: 0x1c3553,
  navyDark: 0x0b1727,
  creamRow: 0xf8f1e4,
  text: '#f5f8fc',
  textDark: '#18304e',
  muted: '#93a7bf',
  green: '#36d27a',
  red: '#e05a5a',
  yellow: '#ffd15a',
  cyan: 0x2bc2ea,
};

const ASSET_URLS = {
  warehouseBackdrop: new URL('../../../assets/environment/warehouse-backdrop.png', import.meta.url).href,
  shelfBay: new URL('../../../assets/environment/shelf-bay.png', import.meta.url).href,
  shelfHeader: new URL('../../../assets/environment/shelf-header.png', import.meta.url).href,
  workerIdle: new URL('../../../assets/character/worker-idle.png', import.meta.url).href,
  workerPick: new URL('../../../assets/character/worker-pick.png', import.meta.url).href,
  cart: new URL('../../../assets/character/cart.png', import.meta.url).href,
  orderPanel: new URL('../../../assets/ui/order-panel.png', import.meta.url).href,
  phoneFrame: new URL('../../../assets/ui/phone-frame.png', import.meta.url).href,
  buttonPrimary: new URL('../../../assets/ui/button-primary.png', import.meta.url).href,
  buttonPrimaryHover: new URL('../../../assets/ui/button-primary-hover.png', import.meta.url).href,
  buttonPrimaryPressed: new URL('../../../assets/ui/button-primary-pressed.png', import.meta.url).href,
  iconStar: new URL('../../../assets/ui/icon-star.png', import.meta.url).href,
  iconMoney: new URL('../../../assets/ui/icon-money.png', import.meta.url).href,
  iconClock: new URL('../../../assets/ui/icon-clock.png', import.meta.url).href,
  iconPause: new URL('../../../assets/ui/icon-pause.png', import.meta.url).href,
  productMilk: new URL('../../../assets/products/milk-carton.png', import.meta.url).href,
  productKefir: new URL('../../../assets/products/kefir.png', import.meta.url).href,
  productBanana: new URL('../../../assets/products/banana.png', import.meta.url).href,
  productApple: new URL('../../../assets/products/apple.png', import.meta.url).href,
  productRice: new URL('../../../assets/products/rice.png', import.meta.url).href,
  productPaper: new URL('../../../assets/products/toilet-paper.png', import.meta.url).href,
  productDumplings: new URL('../../../assets/products/dumplings.png', import.meta.url).href,
  productBerries: new URL('../../../assets/products/frozen-berries.png', import.meta.url).href,
  productChocolate: new URL('../../../assets/products/chocolate.png', import.meta.url).href,
  productDetergent: new URL('../../../assets/products/dish-soap.png', import.meta.url).href,
  productShampoo: new URL('../../../assets/products/shampoo.png', import.meta.url).href,
  productBatteries: new URL('../../../assets/products/batteries.png', import.meta.url).href,
} as const;

const PRODUCT_TEXTURES: Record<string, string> = {
  milk: 'product-milk',
  kefir: 'product-kefir',
  banana: 'product-banana',
  apple: 'product-apple',
  rice: 'product-rice',
  paper: 'product-paper',
  dumplings: 'product-dumplings',
  berries: 'product-berries',
  chocolate: 'product-chocolate',
  detergent: 'product-detergent',
  shampoo: 'product-shampoo',
  batteries: 'product-batteries',
};

const SHELF_GROUPS = [
  { title: 'МОЛОЧНЫЕ', categories: ['dairy'] },
  { title: 'ОВОЩИ И ФРУКТЫ', categories: ['produce'] },
  { title: 'БАКАЛЕЯ И СНЕКИ', categories: ['grocery', 'snacks'] },
  { title: 'ДОМ И ЗАМОРОЗКА', categories: ['household', 'frozen'] },
] as const;

export class ProductionGameScene extends Phaser.Scene {
  private progress!: Progress;
  private order!: Order;
  private cart: Cart = {};
  private timeLeftMs = 0;
  private orderActive = false;
  private isPaused = false;
  private lastReview = 'Первый заказ ждёт тебя. Собери его внимательно.';
  private lastResult: OrderResult | null = null;

  private rankText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private moneyText!: Phaser.GameObjects.Text;
  private ratingText!: Phaser.GameObjects.Text;
  private xpFill!: Phaser.GameObjects.Rectangle;
  private pauseIcon!: Phaser.GameObjects.Image;
  private workerSprite!: Phaser.GameObjects.Image;
  private cartSprite!: Phaser.GameObjects.Image;
  private cartCountText!: Phaser.GameObjects.Text;

  private orderLayer!: Phaser.GameObjects.Container;
  private shelfLayer!: Phaser.GameObjects.Container;
  private cartLayer!: Phaser.GameObjects.Container;
  private phoneLayer!: Phaser.GameObjects.Container;
  private shelfBadgeTexts = new Map<string, Phaser.GameObjects.Text>();

  constructor() {
    super('ProductionGameScene');
  }

  preload(): void {
    this.load.image('warehouse-backdrop', ASSET_URLS.warehouseBackdrop);
    this.load.image('shelf-bay', ASSET_URLS.shelfBay);
    this.load.image('shelf-header', ASSET_URLS.shelfHeader);
    this.load.image('worker-idle', ASSET_URLS.workerIdle);
    this.load.image('worker-pick', ASSET_URLS.workerPick);
    this.load.image('cart', ASSET_URLS.cart);
    this.load.image('order-panel', ASSET_URLS.orderPanel);
    this.load.image('phone-frame', ASSET_URLS.phoneFrame);
    this.load.image('button-primary', ASSET_URLS.buttonPrimary);
    this.load.image('button-primary-hover', ASSET_URLS.buttonPrimaryHover);
    this.load.image('button-primary-pressed', ASSET_URLS.buttonPrimaryPressed);
    this.load.image('icon-star', ASSET_URLS.iconStar);
    this.load.image('icon-money', ASSET_URLS.iconMoney);
    this.load.image('icon-clock', ASSET_URLS.iconClock);
    this.load.image('icon-pause', ASSET_URLS.iconPause);

    this.load.image('product-milk', ASSET_URLS.productMilk);
    this.load.image('product-kefir', ASSET_URLS.productKefir);
    this.load.image('product-banana', ASSET_URLS.productBanana);
    this.load.image('product-apple', ASSET_URLS.productApple);
    this.load.image('product-rice', ASSET_URLS.productRice);
    this.load.image('product-paper', ASSET_URLS.productPaper);
    this.load.image('product-dumplings', ASSET_URLS.productDumplings);
    this.load.image('product-berries', ASSET_URLS.productBerries);
    this.load.image('product-chocolate', ASSET_URLS.productChocolate);
    this.load.image('product-detergent', ASSET_URLS.productDetergent);
    this.load.image('product-shampoo', ASSET_URLS.productShampoo);
    this.load.image('product-batteries', ASSET_URLS.productBatteries);
  }

  create(): void {
    this.progress = loadProgress();
    this.drawStaticLayout();

    this.orderLayer = this.add.container(0, 0).setDepth(40);
    this.shelfLayer = this.add.container(0, 0).setDepth(20);
    this.cartLayer = this.add.container(0, 0).setDepth(34);
    this.phoneLayer = this.add.container(0, 0).setDepth(40);

    this.startNextOrder();
  }

  update(_time: number, delta: number): void {
    if (!this.orderActive || this.isPaused) return;
    this.timeLeftMs -= delta;
    if (this.timeLeftMs <= 0) {
      this.timeLeftMs = 0;
      this.updateTimerText();
      this.submitOrder(true);
      return;
    }
    this.updateTimerText();
  }

  private drawStaticLayout(): void {
    this.add.image(800, 450, 'warehouse-backdrop').setDisplaySize(1600, 900).setDepth(0);
    this.add.rectangle(0, 0, 1600, 900, 0x07111f, 0.06).setOrigin(0).setDepth(1);

    // UI frames are intentionally secondary to the warehouse world.
    this.add.image(22, 145, 'order-panel').setOrigin(0).setDisplaySize(390, 710).setDepth(30);
    this.add.image(1280, 150, 'phone-frame').setOrigin(0).setDisplaySize(294, 705).setDepth(30);

    this.headerCard(28, 18, 390, 82);
    this.headerCard(620, 18, 270, 82);
    this.headerCard(1128, 18, 190, 82);
    this.headerCard(1332, 18, 128, 82);

    // Small worker portrait substitutes a separate avatar asset for now.
    this.add.image(61, 58, 'worker-idle').setDisplaySize(48, 64).setDepth(42);
    this.rankText = this.add.text(93, 34, '', this.headerText(22)).setDepth(42);
    this.add.rectangle(93, 71, 252, 10, 0x081727, 0.78).setOrigin(0).setDepth(41);
    this.xpFill = this.add.rectangle(93, 71, 0, 10, COLORS.cyan, 1).setOrigin(0).setDepth(42);

    this.add.image(652, 59, 'icon-clock').setDisplaySize(32, 32).setDepth(42);
    this.timerText = this.add.text(684, 39, '', this.headerText(30)).setDepth(42);

    this.add.image(1152, 59, 'icon-money').setDisplaySize(31, 31).setDepth(42);
    this.moneyText = this.add.text(1178, 41, '', this.headerText(24)).setDepth(42);

    this.add.image(1352, 59, 'icon-star').setDisplaySize(30, 30).setDepth(42);
    this.ratingText = this.add.text(1376, 41, '', this.headerText(24)).setDepth(42);

    const pauseHit = this.add.rectangle(1475, 18, 92, 82, COLORS.navy, 0.95)
      .setOrigin(0)
      .setStrokeStyle(2, 0x385675)
      .setInteractive({ useHandCursor: true })
      .setDepth(40);
    this.pauseIcon = this.add.image(1521, 59, 'icon-pause').setDisplaySize(34, 34).setDepth(42);
    pauseHit.on('pointerup', () => this.togglePause());

    // Player and cart live inside the warehouse, not in a separate dashboard panel.
    this.workerSprite = this.add.image(846, 730, 'worker-idle')
      .setDisplaySize(126, 168)
      .setDepth(31);
    this.cartSprite = this.add.image(1018, 742, 'cart')
      .setDisplaySize(238, 172)
      .setDepth(31);
    this.cartCountText = this.add.text(935, 646, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#12243ad9',
      padding: { x: 10, y: 6 },
    }).setDepth(40);
  }

  private headerCard(x: number, y: number, width: number, height: number): void {
    this.add.rectangle(x, y, width, height, COLORS.navy, 0.94)
      .setOrigin(0)
      .setStrokeStyle(2, 0x385675)
      .setDepth(40);
  }

  private headerText(size: number): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${size}px`,
      color: COLORS.text,
      fontStyle: 'bold',
    };
  }

  private togglePause(): void {
    if (!this.orderActive) return;
    this.isPaused = !this.isPaused;
    this.pauseIcon.setAlpha(this.isPaused ? 0.45 : 1);
    this.shelfLayer.setAlpha(this.isPaused ? 0.4 : 1);
    this.workerSprite.setAlpha(this.isPaused ? 0.45 : 1);
    this.cartSprite.setAlpha(this.isPaused ? 0.45 : 1);
  }

  private startNextOrder(): void {
    this.order = generateOrder(this.progress.nextOrderId, this.progress.completedOrders);
    this.cart = {};
    this.timeLeftMs = this.order.timeLimitSec * 1000;
    this.orderActive = true;
    this.isPaused = false;
    this.pauseIcon?.setAlpha(1);
    this.shelfLayer?.setAlpha(1);
    this.workerSprite?.setAlpha(1).setTexture('worker-idle').setPosition(846, 730);
    this.cartSprite?.setAlpha(1);
    this.renderAll();
  }

  private renderAll(): void {
    this.renderHeader();
    this.renderOrder();
    this.renderShelf();
    this.renderCart();
    this.renderPhone();
  }

  private renderHeader(): void {
    const rank = getRank(this.progress.xp);
    const nextRank = getNextRank(this.progress.xp);
    this.rankText.setText(rank.title.toUpperCase());
    this.moneyText.setText(`${this.progress.money.toLocaleString('ru-RU')} ₽`);
    this.ratingText.setText(this.progress.rating.toFixed(1));

    const currentMin = rank.minXp;
    const nextMin = nextRank?.minXp ?? Math.max(currentMin + 1, this.progress.xp);
    const ratio = nextRank
      ? Phaser.Math.Clamp((this.progress.xp - currentMin) / Math.max(1, nextMin - currentMin), 0, 1)
      : 1;
    this.xpFill.width = 252 * ratio;
    this.updateTimerText();
  }

  private updateTimerText(): void {
    const seconds = Math.max(0, Math.ceil(this.timeLeftMs / 1000));
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    this.timerText
      .setText(`${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`)
      .setColor(seconds <= 20 ? '#ff7979' : COLORS.text);
  }

  private renderOrder(): void {
    this.orderLayer.removeAll(true);
    this.orderLayer.add(this.add.text(47, 171, `ЗАКАЗ #${this.order.id}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '27px',
      color: COLORS.textDark,
      fontStyle: 'bold',
    }));

    this.order.lines.forEach((line, index) => {
      const product = PRODUCT_BY_ID.get(line.productId);
      if (!product) return;
      const y = 223 + index * 80;
      const row = this.add.rectangle(41, y, 350, 66, COLORS.creamRow, 0.96)
        .setOrigin(0)
        .setStrokeStyle(1, 0xd3c5ad);
      this.orderLayer.add(row);
      this.addProductVisual(this.orderLayer, line.productId, 76, y + 33, 52);

      this.orderLayer.add(this.add.text(111, y + 11, product.name, {
        fontFamily: 'Arial, sans-serif',
        fontSize: product.name.length > 18 ? '15px' : '18px',
        color: COLORS.textDark,
        fontStyle: 'bold',
        wordWrap: { width: 190 },
      }));

      if (line.unavailable) {
        this.orderLayer.add(this.add.text(370, y + 22, 'НЕТ', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          color: COLORS.red,
          fontStyle: 'bold',
        }).setOrigin(1, 0));
      } else {
        const picked = Math.min(this.cart[line.productId] ?? 0, line.quantity);
        this.orderLayer.add(this.add.text(370, y + 22, `${picked} / ${line.quantity}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: picked >= line.quantity ? '#218d53' : '#667486',
          fontStyle: 'bold',
        }).setOrigin(1, 0));
      }
    });

    const total = Object.values(this.cart).reduce((sum, value) => sum + value, 0);
    this.orderLayer.add(this.add.text(49, 720, `Собрано: ${total} шт.`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#6f7782',
    }));

    const submit = this.add.image(216, 811, 'button-primary')
      .setDisplaySize(330, 64)
      .setInteractive({ useHandCursor: true });
    submit.on('pointerover', () => {
      if (this.orderActive && !this.isPaused) submit.setTexture('button-primary-hover');
    });
    submit.on('pointerout', () => submit.setTexture('button-primary'));
    submit.on('pointerdown', () => submit.setTexture('button-primary-pressed'));
    submit.on('pointerup', () => {
      submit.setTexture('button-primary-hover');
      if (!this.orderActive || this.isPaused) return;
      this.submitOrder(false);
    });
    if (!this.orderActive) submit.setAlpha(0.55).disableInteractive();
    this.orderLayer.add(submit);
    this.orderLayer.add(this.add.text(216, 811, this.orderActive ? 'ОТПРАВИТЬ ЗАКАЗ' : 'ЗАКАЗ ОТПРАВЛЕН', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '19px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5));
  }

  private renderShelf(): void {
    this.shelfLayer.removeAll(true);
    this.shelfBadgeTexts.clear();

    const startX = 442;
    const startY = 205;
    const bayWidth = 192;
    const bayHeight = 438;
    const gap = 10;
    const slotY = [82, 181, 280, 379];

    const buckets: string[][] = SHELF_GROUPS.map(() => []);
    for (const productId of this.order.shelfProductIds) {
      const product = PRODUCT_BY_ID.get(productId);
      if (!product) continue;
      const groupIndex = SHELF_GROUPS.findIndex((group) => group.categories.includes(product.category as never));
      buckets[Math.max(0, groupIndex)].push(productId);
    }

    for (let col = 0; col < 4; col += 1) {
      const x = startX + col * (bayWidth + gap);
      const header = this.add.image(x, startY - 54, 'shelf-header')
        .setOrigin(0)
        .setDisplaySize(bayWidth, 48);
      const bay = this.add.image(x, startY, 'shelf-bay')
        .setOrigin(0)
        .setDisplaySize(bayWidth, bayHeight);
      this.shelfLayer.add([header, bay]);
      this.shelfLayer.add(this.add.text(x + bayWidth / 2, startY - 30, SHELF_GROUPS[col].title, {
        fontFamily: 'Arial, sans-serif',
        fontSize: col === 2 || col === 3 ? '12px' : '13px',
        color: '#eef4fb',
        fontStyle: 'bold',
        align: 'center',
      }).setOrigin(0.5));

      buckets[col].slice(0, 4).forEach((productId, row) => {
        const product = PRODUCT_BY_ID.get(productId);
        if (!product) return;
        const centerX = x + bayWidth / 2;
        const centerY = startY + slotY[row];
        const hit = this.add.rectangle(centerX, centerY, bayWidth - 22, 86, 0xffffff, 0.001)
          .setInteractive({ useHandCursor: true });
        this.shelfLayer.add(hit);
        this.addProductVisual(this.shelfLayer, productId, centerX, centerY - 7, 66);
        this.shelfLayer.add(this.add.text(centerX, centerY + 31, product.shortName, {
          fontFamily: 'Arial, sans-serif',
          fontSize: product.shortName.length > 11 ? '12px' : '13px',
          color: '#edf2f8',
          align: 'center',
        }).setOrigin(0.5));

        const badge = this.add.text(centerX + 69, centerY - 37, '', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          color: '#ffffff',
          backgroundColor: '#208bc6',
          padding: { x: 6, y: 2 },
        }).setOrigin(1, 0);
        this.shelfLayer.add(badge);
        this.shelfBadgeTexts.set(productId, badge);
        this.updateShelfBadge(productId);

        hit.on('pointerover', () => {
          if (!this.orderActive || this.isPaused) return;
          hit.setFillStyle(0x71d7ff, 0.09).setStrokeStyle(2, 0x8fe2ff, 0.85);
        });
        hit.on('pointerout', () => hit.setFillStyle(0xffffff, 0.001).setStrokeStyle());
        hit.on('pointerup', () => {
          if (!this.orderActive || this.isPaused) return;
          this.addToCart(productId, centerX, centerY);
        });
      });
    }
  }

  private renderCart(): void {
    this.cartLayer.removeAll(true);
    const entries = Object.entries(this.cart).filter(([, count]) => count > 0);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    this.cartCountText.setText(total > 0 ? `В заказе: ${total} шт.` : 'Тележка пустая');

    // Items sit visually inside the trolley basket.
    const shown = entries.slice(0, 6);
    shown.forEach(([productId, count], index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 975 + col * 49;
      const y = 719 + row * 47;
      const hit = this.add.rectangle(x, y, 44, 42, 0x10243a, 0.55)
        .setOrigin(0.5)
        .setStrokeStyle(1, 0x5a7797, 0.65)
        .setInteractive({ useHandCursor: true });
      this.cartLayer.add(hit);
      this.addProductVisual(this.cartLayer, productId, x, y - 3, 38);
      this.cartLayer.add(this.add.text(x + 15, y + 10, `×${count}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#17314dcc',
        padding: { x: 2, y: 1 },
      }).setOrigin(0.5));
      hit.on('pointerup', () => {
        if (!this.orderActive || this.isPaused) return;
        this.removeFromCart(productId);
      });
    });
  }

  private renderPhone(): void {
    this.phoneLayer.removeAll(true);
    const rank = getRank(this.progress.xp);
    const nextRank = getNextRank(this.progress.xp);

    this.phoneLayer.add(this.add.text(1300, 175, 'ПОСЛЕДНИЙ ЗАКАЗ', {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: COLORS.text, fontStyle: 'bold',
    }));

    const card = this.add.rectangle(1297, 213, 260, 190, COLORS.navySoft, 0.93)
      .setOrigin(0)
      .setStrokeStyle(1, 0x3d5a79);
    this.phoneLayer.add(card);

    if (this.orderActive) {
      this.phoneLayer.add(this.add.text(1312, 232, 'Ожидает отправки', {
        fontFamily: 'Arial, sans-serif', fontSize: '15px', color: COLORS.muted, fontStyle: 'bold',
      }));
      this.phoneLayer.add(this.add.text(1312, 270, `«${this.lastReview}»`, {
        fontFamily: 'Arial, sans-serif', fontSize: '15px', color: COLORS.text,
        wordWrap: { width: 228 }, lineSpacing: 4,
      }));
    } else if (this.lastResult) {
      const result = this.lastResult;
      const moneyPrefix = result.netPay > 0 ? '+' : '';
      this.phoneLayer.add(this.add.text(1312, 226, `${moneyPrefix}${result.netPay} ₽`, {
        fontFamily: 'Arial, sans-serif', fontSize: '30px',
        color: result.netPay >= 0 ? COLORS.green : COLORS.red, fontStyle: 'bold',
      }));
      this.phoneLayer.add(this.add.text(1312, 266, `${'★'.repeat(result.stars)}${'☆'.repeat(5 - result.stars)}`, {
        fontFamily: 'Arial, sans-serif', fontSize: '21px', color: COLORS.yellow,
      }));
      this.phoneLayer.add(this.add.text(1312, 306, `«${this.lastReview}»`, {
        fontFamily: 'Arial, sans-serif', fontSize: '14px', color: COLORS.text,
        wordWrap: { width: 228 }, lineSpacing: 3,
      }));
    }

    this.phoneLayer.add(this.add.text(1300, 430, 'ВАШ РЕЙТИНГ', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: COLORS.muted,
    }));
    this.phoneLayer.add(this.add.image(1316, 476, 'icon-star').setDisplaySize(28, 28));
    this.phoneLayer.add(this.add.text(1337, 459, this.progress.rating.toFixed(1), {
      fontFamily: 'Arial, sans-serif', fontSize: '26px', color: COLORS.text, fontStyle: 'bold',
    }));

    this.phoneLayer.add(this.add.text(1300, 516, nextRank ? `ДО ${nextRank.title.toUpperCase()}` : 'МАКСИМАЛЬНЫЙ РАНГ', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: COLORS.muted,
    }));
    this.phoneLayer.add(this.add.rectangle(1300, 548, 240, 12, 0x102239, 1).setOrigin(0));
    const currentMin = rank.minXp;
    const nextMin = nextRank?.minXp ?? Math.max(currentMin + 1, this.progress.xp);
    const ratio = nextRank
      ? Phaser.Math.Clamp((this.progress.xp - currentMin) / Math.max(1, nextMin - currentMin), 0, 1)
      : 1;
    this.phoneLayer.add(this.add.rectangle(1300, 548, 240 * ratio, 12, COLORS.cyan, 1).setOrigin(0));
    this.phoneLayer.add(this.add.text(1300, 568, nextRank ? `${this.progress.xp} / ${nextRank.minXp} XP` : `${this.progress.xp} XP`, {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: COLORS.muted,
    }));

    if (!this.orderActive && this.lastResult) {
      const details = this.lastResult;
      this.phoneLayer.add(this.add.text(1300, 604,
        `Точно ${details.exactCount} · Замены ${details.replacementCount}\nПропущено ${details.missingCount} · Лишнее ${details.extraCount}`,
        { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: COLORS.muted, lineSpacing: 5 },
      ));

      const nextButton = this.add.image(1420, 810, 'button-primary')
        .setDisplaySize(238, 58)
        .setInteractive({ useHandCursor: true });
      this.phoneLayer.add(nextButton);
      this.phoneLayer.add(this.add.text(1420, 810, 'СЛЕДУЮЩИЙ ЗАКАЗ', {
        fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5));
      nextButton.on('pointerover', () => nextButton.setTexture('button-primary-hover'));
      nextButton.on('pointerout', () => nextButton.setTexture('button-primary'));
      nextButton.on('pointerdown', () => nextButton.setTexture('button-primary-pressed'));
      nextButton.on('pointerup', () => this.startNextOrder());
    } else {
      this.addPhoneMenuRow(1299, 626, 'Заказы');
      this.addPhoneMenuRow(1299, 678, 'Улучшения');
      this.addPhoneMenuRow(1299, 730, 'Статистика');
    }
  }

  private addPhoneMenuRow(x: number, y: number, label: string): void {
    const row = this.add.rectangle(x, y, 242, 42, 0x18314d, 0.9)
      .setOrigin(0)
      .setStrokeStyle(1, 0x355675);
    this.phoneLayer.add(row);
    this.phoneLayer.add(this.add.text(x + 18, y + 11, label, {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#dfe9f5',
    }));
  }

  private addProductVisual(
    container: Phaser.GameObjects.Container,
    productId: string,
    x: number,
    y: number,
    size: number,
  ): void {
    const texture = PRODUCT_TEXTURES[productId];
    if (!texture || !this.textures.exists(texture)) return;
    container.add(this.add.image(x, y, texture).setDisplaySize(size, size));
  }

  private addToCart(productId: string, x: number, y: number): void {
    this.cart[productId] = (this.cart[productId] ?? 0) + 1;
    this.updateShelfBadge(productId);
    this.renderOrder();
    this.renderCart();

    const originalX = this.workerSprite.x;
    const targetX = Phaser.Math.Clamp(x, 560, 1110);
    this.workerSprite.setTexture('worker-pick');
    this.tweens.killTweensOf(this.workerSprite);
    this.tweens.add({
      targets: this.workerSprite,
      x: targetX,
      duration: 140,
      ease: 'Quad.easeOut',
      yoyo: true,
      hold: 80,
      onComplete: () => {
        this.workerSprite.setTexture('worker-idle').setX(originalX);
      },
    });

    const texture = PRODUCT_TEXTURES[productId];
    if (texture && this.textures.exists(texture)) {
      const fly = this.add.image(x, y, texture).setDisplaySize(58, 58).setDepth(80);
      this.tweens.add({
        targets: fly,
        x: 1020,
        y: 730,
        scale: 0.55,
        alpha: 0.2,
        duration: 360,
        ease: 'Quad.easeIn',
        onComplete: () => fly.destroy(),
      });
    }
  }

  private removeFromCart(productId: string): void {
    const current = this.cart[productId] ?? 0;
    if (current <= 1) delete this.cart[productId];
    else this.cart[productId] = current - 1;
    this.updateShelfBadge(productId);
    this.renderOrder();
    this.renderCart();
  }

  private updateShelfBadge(productId: string): void {
    const badge = this.shelfBadgeTexts.get(productId);
    if (!badge) return;
    const count = this.cart[productId] ?? 0;
    badge.setText(count > 0 ? `×${count}` : '').setVisible(count > 0);
  }

  private submitOrder(timedOut: boolean): void {
    if (!this.orderActive) return;
    this.orderActive = false;
    this.isPaused = false;
    const result = scoreOrder(this.order, this.cart, timedOut);
    this.lastResult = result;
    this.lastReview = pickReview(result.bucket);

    this.progress.money += result.netPay;
    this.progress.rating = Phaser.Math.Clamp(this.progress.rating + result.ratingDelta, 1, 5);
    this.progress.xp += result.xp;
    this.progress.completedOrders += 1;
    this.progress.nextOrderId += 1;
    saveProgress(this.progress);

    this.renderHeader();
    this.renderOrder();
    this.renderPhone();
  }
}
