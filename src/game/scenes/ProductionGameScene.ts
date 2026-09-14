import Phaser from 'phaser';
import { PRODUCT_BY_ID } from '../data/products';
import { getNextRank, getRank } from '../data/ranks';
import { pickReview } from '../data/reviews';
import { generateOrder } from '../services/order-generator';
import { scoreOrder } from '../services/scoring';
import { loadProgress, saveProgress } from '../services/save';
import type { Cart, Order, OrderResult, Progress } from '../types';

const COLORS = {
  navy: 0x13243a,
  navyDark: 0x0d1929,
  navySoft: 0x1b314d,
  cream: 0xf0e7d5,
  creamRow: 0xf7f0e3,
  textDark: '#17304f',
  text: '#f4f7fb',
  muted: '#91a4bc',
  green: '#39d27d',
  red: '#ff7474',
  yellow: '#ffd15a',
  cyan: '#2bc2ea',
};

const url = (path: string) => new URL(`../../../assets/${path}`, import.meta.url).href;

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
};

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

  private orderLayer!: Phaser.GameObjects.Container;
  private shelfLayer!: Phaser.GameObjects.Container;
  private cartLayer!: Phaser.GameObjects.Container;
  private phoneLayer!: Phaser.GameObjects.Container;
  private shelfBadgeTexts = new Map<string, Phaser.GameObjects.Text>();

  constructor() {
    super('ProductionGameScene');
  }

  preload(): void {
    this.load.image('warehouse-backdrop', url('environment/warehouse-backdrop.png'));
    this.load.image('shelf-bay', url('environment/shelf-bay.png'));
    this.load.image('shelf-header', url('environment/shelf-header.png'));
    this.load.image('worker-idle', url('character/worker-idle.png'));
    this.load.image('worker-pick', url('character/worker-pick.png'));
    this.load.image('cart', url('character/cart.png'));
    this.load.image('order-panel', url('ui/order-panel.png'));
    this.load.image('phone-frame', url('ui/phone-frame.png'));
    this.load.image('button-primary', url('ui/button-primary.png'));
    this.load.image('button-primary-hover', url('ui/button-primary-hover.png'));
    this.load.image('button-primary-pressed', url('ui/button-primary-pressed.png'));
    this.load.image('icon-star', url('ui/icon-star.png'));
    this.load.image('icon-money', url('ui/icon-money.png'));
    this.load.image('icon-clock', url('ui/icon-clock.png'));
    this.load.image('icon-pause', url('ui/icon-pause.png'));

    this.load.image('product-milk', url('products/milk-carton.png'));
    this.load.image('product-kefir', url('products/kefir.png'));
    this.load.image('product-banana', url('products/banana.png'));
    this.load.image('product-apple', url('products/apple.png'));
    this.load.image('product-rice', url('products/rice.png'));
    this.load.image('product-paper', url('products/toilet-paper.png'));
    this.load.image('product-dumplings', url('products/dumplings.png'));
    this.load.image('product-berries', url('products/frozen-berries.png'));
    this.load.image('product-chocolate', url('products/chocolate.png'));
    this.load.image('product-detergent', url('products/dish-soap.png'));
    this.load.image('product-shampoo', url('products/shampoo.png'));
  }

  create(): void {
    this.progress = loadProgress();
    this.drawStaticLayout();

    this.orderLayer = this.add.container(0, 0).setDepth(20);
    this.shelfLayer = this.add.container(0, 0).setDepth(15);
    this.cartLayer = this.add.container(0, 0).setDepth(18);
    this.phoneLayer = this.add.container(0, 0).setDepth(20);

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
    this.add.rectangle(0, 0, 1600, 900, 0x07111f, 0.14).setOrigin(0).setDepth(1);

    this.add.image(24, 126, 'order-panel').setOrigin(0).setDisplaySize(350, 750).setDepth(10);
    this.add.image(1216, 126, 'phone-frame').setOrigin(0).setDisplaySize(360, 750).setDepth(10);

    this.headerCard(24, 18, 350, 86);
    this.headerCard(580, 18, 280, 86);
    this.headerCard(1080, 18, 210, 86);
    this.headerCard(1310, 18, 170, 86);

    this.rankText = this.add.text(48, 34, '', this.headerText(23)).setDepth(20);
    this.xpFill = this.add.rectangle(48, 76, 0, 10, 0x2bc2ea, 1).setOrigin(0).setDepth(21);
    this.add.rectangle(48, 76, 286, 10, 0x081727, 0.75).setOrigin(0).setDepth(20);
    this.xpFill.setDepth(21);

    this.add.image(610, 61, 'icon-clock').setDisplaySize(34, 34).setDepth(20);
    this.timerText = this.add.text(648, 42, '', this.headerText(31)).setDepth(20);

    this.add.image(1103, 61, 'icon-money').setDisplaySize(34, 34).setDepth(20);
    this.moneyText = this.add.text(1132, 42, '', this.headerText(26)).setDepth(20);

    this.add.image(1332, 61, 'icon-star').setDisplaySize(34, 34).setDepth(20);
    this.ratingText = this.add.text(1364, 42, '', this.headerText(27)).setDepth(20);

    const pauseHit = this.add.rectangle(1498, 18, 78, 86, COLORS.navy, 0.96)
      .setOrigin(0)
      .setStrokeStyle(2, 0x385675)
      .setInteractive({ useHandCursor: true })
      .setDepth(18);
    this.pauseIcon = this.add.image(1537, 60, 'icon-pause').setDisplaySize(36, 36).setDepth(20);
    pauseHit.on('pointerup', () => this.togglePause());
  }

  private headerCard(x: number, y: number, width: number, height: number): void {
    this.add.rectangle(x, y, width, height, COLORS.navy, 0.96)
      .setOrigin(0)
      .setStrokeStyle(2, 0x385675)
      .setDepth(18);
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
    this.shelfLayer.setAlpha(this.isPaused ? 0.42 : 1);
    this.phoneLayer.setAlpha(this.isPaused ? 0.58 : 1);
  }

  private startNextOrder(): void {
    this.order = generateOrder(this.progress.nextOrderId, this.progress.completedOrders);
    this.cart = {};
    this.timeLeftMs = this.order.timeLimitSec * 1000;
    this.orderActive = true;
    this.isPaused = false;
    this.pauseIcon?.setAlpha(1);
    this.shelfLayer?.setAlpha(1);
    this.phoneLayer?.setAlpha(1);
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
    this.xpFill.width = 286 * ratio;
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
    this.orderLayer.add(this.add.text(48, 156, `ЗАКАЗ #${this.order.id}`, {
      fontFamily: 'Arial, sans-serif', fontSize: '27px', color: COLORS.textDark, fontStyle: 'bold',
    }));

    this.order.lines.forEach((line, index) => {
      const product = PRODUCT_BY_ID.get(line.productId);
      if (!product) return;
      const y = 208 + index * 82;
      const row = this.add.rectangle(44, y, 310, 68, COLORS.creamRow, 0.95)
        .setOrigin(0)
        .setStrokeStyle(1, 0xd3c5ad);
      this.orderLayer.add(row);
      this.addProductVisual(this.orderLayer, line.productId, 75, y + 34, 54);

      this.orderLayer.add(this.add.text(108, y + 12, product.name, {
        fontFamily: 'Arial, sans-serif',
        fontSize: product.name.length > 17 ? '16px' : '18px',
        color: COLORS.textDark,
        fontStyle: 'bold',
        wordWrap: { width: 154 },
      }));

      if (line.unavailable) {
        this.orderLayer.add(this.add.text(334, y + 24, 'НЕТ', {
          fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#cb4b4b', fontStyle: 'bold',
        }).setOrigin(1, 0));
      } else {
        const picked = Math.min(this.cart[line.productId] ?? 0, line.quantity);
        this.orderLayer.add(this.add.text(334, y + 23, `${picked} / ${line.quantity}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '19px',
          color: picked >= line.quantity ? '#218d53' : '#667486',
          fontStyle: 'bold',
        }).setOrigin(1, 0));
      }
    });

    const total = Object.values(this.cart).reduce((sum, value) => sum + value, 0);
    this.orderLayer.add(this.add.text(48, 704, `Собрано: ${total} шт.`, {
      fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#69717d',
    }));

    const submit = this.add.image(199, 819, 'button-primary')
      .setDisplaySize(302, 66)
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
    this.orderLayer.add(this.add.text(199, 819, this.orderActive ? 'ОТПРАВИТЬ ЗАКАЗ' : 'ЗАКАЗ ОТПРАВЛЕН', {
      fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5));
  }

  private renderShelf(): void {
    this.shelfLayer.removeAll(true);
    this.shelfBadgeTexts.clear();

    const startX = 408;
    const startY = 164;
    const bayWidth = 148;
    const bayHeight = 448;
    const gap = 5;
    const slotY = [55, 160, 265, 370];

    for (let col = 0; col < 5; col += 1) {
      const x = startX + col * (bayWidth + gap);
      const header = this.add.image(x, startY - 42, 'shelf-header').setOrigin(0).setDisplaySize(bayWidth, 37);
      const bay = this.add.image(x, startY, 'shelf-bay').setOrigin(0).setDisplaySize(bayWidth, bayHeight);
      this.shelfLayer.add([header, bay]);
    }

    this.order.shelfProductIds.slice(0, 20).forEach((productId, index) => {
      const product = PRODUCT_BY_ID.get(productId);
      if (!product) return;
      const col = Math.floor(index / 4);
      const row = index % 4;
      const x = startX + col * (bayWidth + gap);
      const centerX = x + bayWidth / 2;
      const centerY = startY + slotY[row];

      const hit = this.add.rectangle(centerX, centerY, bayWidth - 12, 94, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      this.shelfLayer.add(hit);
      this.addProductVisual(this.shelfLayer, productId, centerX, centerY - 6, 60);
      this.shelfLayer.add(this.add.text(centerX, centerY + 31, product.shortName, {
        fontFamily: 'Arial, sans-serif',
        fontSize: product.shortName.length > 10 ? '12px' : '13px',
        color: '#e4e9f0',
        align: 'center',
      }).setOrigin(0.5));

      const badge = this.add.text(centerX + 54, centerY - 39, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#ffffff',
        backgroundColor: '#208bc6',
        padding: { x: 6, y: 2 },
      }).setOrigin(1, 0);
      this.shelfLayer.add(badge);
      this.shelfBadgeTexts.set(productId, badge);
      this.updateShelfBadge(productId);

      hit.on('pointerover', () => {
        if (!this.orderActive || this.isPaused) return;
        hit.setFillStyle(0x71d7ff, 0.08).setStrokeStyle(2, 0x8fe2ff, 0.85);
      });
      hit.on('pointerout', () => hit.setFillStyle(0xffffff, 0.001).setStrokeStyle());
      hit.on('pointerup', () => {
        if (!this.orderActive || this.isPaused) return;
        this.addToCart(productId, centerX, centerY);
      });
    });
  }

  private renderCart(): void {
    this.cartLayer.removeAll(true);
    const panel = this.add.rectangle(396, 640, 798, 236, COLORS.navy, 0.95)
      .setOrigin(0)
      .setStrokeStyle(2, 0x395775);
    this.cartLayer.add(panel);

    const entries = Object.entries(this.cart).filter(([, count]) => count > 0);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    this.cartLayer.add(this.add.text(418, 657, `КОРЗИНА  •  ${total} шт.`, {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', color: COLORS.text, fontStyle: 'bold',
    }));
    this.cartLayer.add(this.add.text(418, 684, 'Нажми на товар в корзине, чтобы убрать одну штуку', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: COLORS.muted,
    }));

    const shown = entries.slice(0, 6);
    shown.forEach(([productId, count], index) => {
      const x = 430 + index * 74;
      const y = 755;
      const hit = this.add.rectangle(x, y, 62, 72, 0x203856, 0.9)
        .setOrigin(0.5)
        .setStrokeStyle(1, 0x4b6b8f)
        .setInteractive({ useHandCursor: true });
      this.cartLayer.add(hit);
      this.addProductVisual(this.cartLayer, productId, x, y - 6, 48);
      this.cartLayer.add(this.add.text(x + 22, y + 18, `×${count}`, {
        fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5));
      hit.on('pointerup', () => {
        if (!this.orderActive || this.isPaused) return;
        this.removeFromCart(productId);
      });
    });

    this.cartLayer.add(this.add.image(970, 772, 'worker-idle').setDisplaySize(76, 102));
    this.cartLayer.add(this.add.image(1080, 770, 'cart').setDisplaySize(128, 102));
  }

  private renderPhone(): void {
    this.phoneLayer.removeAll(true);
    const rank = getRank(this.progress.xp);
    const nextRank = getNextRank(this.progress.xp);

    this.phoneLayer.add(this.add.text(1244, 160, 'ПОСЛЕДНИЙ ЗАКАЗ', {
      fontFamily: 'Arial, sans-serif', fontSize: '17px', color: COLORS.text, fontStyle: 'bold',
    }));

    const card = this.add.rectangle(1242, 206, 308, 178, COLORS.navySoft, 0.92)
      .setOrigin(0)
      .setStrokeStyle(1, 0x3d5a79);
    this.phoneLayer.add(card);

    if (this.orderActive) {
      this.phoneLayer.add(this.add.text(1260, 224, 'Ожидает отправки', {
        fontFamily: 'Arial, sans-serif', fontSize: '17px', color: COLORS.muted, fontStyle: 'bold',
      }));
      this.phoneLayer.add(this.add.text(1260, 264, `«${this.lastReview}»`, {
        fontFamily: 'Arial, sans-serif', fontSize: '16px', color: COLORS.text,
        wordWrap: { width: 270 }, lineSpacing: 5,
      }));
    } else if (this.lastResult) {
      const result = this.lastResult;
      const moneyPrefix = result.netPay > 0 ? '+' : '';
      this.phoneLayer.add(this.add.text(1260, 220, `${moneyPrefix}${result.netPay} ₽`, {
        fontFamily: 'Arial, sans-serif', fontSize: '32px',
        color: result.netPay >= 0 ? COLORS.green : COLORS.red, fontStyle: 'bold',
      }));
      this.phoneLayer.add(this.add.text(1260, 264, `${'★'.repeat(result.stars)}${'☆'.repeat(5 - result.stars)}`, {
        fontFamily: 'Arial, sans-serif', fontSize: '24px', color: COLORS.yellow,
      }));
      this.phoneLayer.add(this.add.text(1260, 306, `«${this.lastReview}»`, {
        fontFamily: 'Arial, sans-serif', fontSize: '15px', color: COLORS.text,
        wordWrap: { width: 270 }, lineSpacing: 4,
      }));
    }

    this.phoneLayer.add(this.add.text(1244, 430, 'ВАШ РЕЙТИНГ', {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: COLORS.muted,
    }));
    this.phoneLayer.add(this.add.image(1260, 480, 'icon-star').setDisplaySize(30, 30));
    this.phoneLayer.add(this.add.text(1282, 461, this.progress.rating.toFixed(1), {
      fontFamily: 'Arial, sans-serif', fontSize: '28px', color: COLORS.text, fontStyle: 'bold',
    }));

    this.phoneLayer.add(this.add.text(1244, 526, 'ДО СЛЕДУЮЩЕГО РАНГА', {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: COLORS.muted,
    }));
    const track = this.add.rectangle(1244, 570, 286, 14, 0x102239, 1).setOrigin(0);
    this.phoneLayer.add(track);
    const currentMin = rank.minXp;
    const nextMin = nextRank?.minXp ?? Math.max(currentMin + 1, this.progress.xp);
    const ratio = nextRank
      ? Phaser.Math.Clamp((this.progress.xp - currentMin) / Math.max(1, nextMin - currentMin), 0, 1)
      : 1;
    const fill = this.add.rectangle(1244, 570, 286 * ratio, 14, 0x2bc2ea, 1).setOrigin(0);
    this.phoneLayer.add(fill);
    this.phoneLayer.add(this.add.text(1244, 596, nextRank ? `${this.progress.xp} / ${nextRank.minXp} XP` : `${this.progress.xp} XP • ТОП`, {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: COLORS.muted,
    }));

    if (!this.orderActive && this.lastResult) {
      const details = this.lastResult;
      this.phoneLayer.add(this.add.text(1244, 650,
        `Точно ${details.exactCount}   Замены ${details.replacementCount}\nПропущено ${details.missingCount}   Лишнее ${details.extraCount}   XP +${details.xp}`,
        { fontFamily: 'Arial, sans-serif', fontSize: '14px', color: COLORS.muted, lineSpacing: 5 },
      ));

      const nextButton = this.add.image(1396, 807, 'button-primary')
        .setDisplaySize(286, 62)
        .setInteractive({ useHandCursor: true });
      this.phoneLayer.add(nextButton);
      this.phoneLayer.add(this.add.text(1396, 807, 'СЛЕДУЮЩИЙ ЗАКАЗ', {
        fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5));
      nextButton.on('pointerover', () => nextButton.setTexture('button-primary-hover'));
      nextButton.on('pointerout', () => nextButton.setTexture('button-primary'));
      nextButton.on('pointerdown', () => nextButton.setTexture('button-primary-pressed'));
      nextButton.on('pointerup', () => this.startNextOrder());
    }
  }

  private addProductVisual(
    container: Phaser.GameObjects.Container,
    productId: string,
    x: number,
    y: number,
    size: number,
  ): void {
    const product = PRODUCT_BY_ID.get(productId);
    if (!product) return;
    const texture = PRODUCT_TEXTURES[productId];
    if (texture && this.textures.exists(texture)) {
      const image = this.add.image(x, y, texture).setDisplaySize(size, size);
      container.add(image);
      return;
    }
    const fallback = this.add.text(x, y, product.icon, {
      fontFamily: 'Arial, sans-serif', fontSize: `${Math.round(size * 0.62)}px`,
    }).setOrigin(0.5);
    container.add(fallback);
  }

  private addToCart(productId: string, x: number, y: number): void {
    this.cart[productId] = (this.cart[productId] ?? 0) + 1;
    this.updateShelfBadge(productId);
    this.renderOrder();
    this.renderCart();

    const product = PRODUCT_BY_ID.get(productId);
    const texture = PRODUCT_TEXTURES[productId];
    if (product && texture && this.textures.exists(texture)) {
      const fly = this.add.image(x, y, texture).setDisplaySize(52, 52).setDepth(80);
      this.tweens.add({
        targets: fly,
        x: 760,
        y: 740,
        scale: 0.45,
        alpha: 0.15,
        duration: 330,
        ease: 'Quad.easeIn',
        onComplete: () => fly.destroy(),
      });
    } else {
      const feedback = this.add.text(x, y, '+1', {
        fontFamily: 'Arial, sans-serif', fontSize: '24px', color: '#7de6a1', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(80);
      this.tweens.add({
        targets: feedback, y: y - 42, alpha: 0, duration: 320,
        onComplete: () => feedback.destroy(),
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
