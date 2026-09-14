import Phaser from 'phaser';
import { PRODUCT_BY_ID } from '../data/products';
import { getNextRank, getRank } from '../data/ranks';
import { pickReview } from '../data/reviews';
import { generateOrder } from '../services/order-generator';
import { scoreOrder } from '../services/scoring';
import { loadProgress, saveProgress } from '../services/save';
import type { Cart, Order, OrderResult, Progress } from '../types';

const COLORS = {
  background: 0x101827,
  panel: 0x17243a,
  panelDark: 0x111b2d,
  border: 0x314966,
  text: '#f4f7fb',
  muted: '#94a7bf',
  blue: 0x2f9ae0,
  green: 0x2eaf68,
  yellow: 0xf0b83f,
  red: 0xd95b5b,
};

export class GameScene extends Phaser.Scene {
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
  private pauseText!: Phaser.GameObjects.Text;

  private orderLayer!: Phaser.GameObjects.Container;
  private shelfLayer!: Phaser.GameObjects.Container;
  private cartLayer!: Phaser.GameObjects.Container;
  private phoneLayer!: Phaser.GameObjects.Container;
  private shelfBadgeTexts = new Map<string, Phaser.GameObjects.Text>();

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.progress = loadProgress();
    this.drawStaticLayout();

    this.orderLayer = this.add.container(0, 0);
    this.shelfLayer = this.add.container(0, 0);
    this.cartLayer = this.add.container(0, 0);
    this.phoneLayer = this.add.container(0, 0);

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
    this.add.rectangle(0, 0, 1600, 900, COLORS.background).setOrigin(0);

    // Subtle warehouse geometry. No decorative text: gameplay remains dominant.
    for (let x = 400; x <= 1180; x += 156) {
      this.add.rectangle(x, 118, 4, 754, 0x24344c, 0.45).setOrigin(0);
    }
    for (let y = 170; y <= 660; y += 122) {
      this.add.rectangle(396, y, 798, 3, 0x24344c, 0.5).setOrigin(0);
    }

    this.panel(24, 18, 1552, 86, COLORS.panelDark);
    this.panel(24, 126, 350, 750, COLORS.panel);
    this.panel(396, 126, 798, 552, COLORS.panelDark);
    this.panel(396, 700, 798, 176, COLORS.panel);
    this.panel(1216, 126, 360, 750, 0x0c1728, 1, 0x365275);

    this.add.text(416, 142, 'ТОВАРЫ НА ПОЛКЕ', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: COLORS.muted,
      fontStyle: 'bold',
    });

    this.rankText = this.add.text(54, 44, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '27px',
      color: COLORS.text,
      fontStyle: 'bold',
    });

    this.timerText = this.add.text(708, 44, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '30px',
      color: COLORS.text,
      fontStyle: 'bold',
    });

    this.moneyText = this.add.text(1100, 44, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '27px',
      color: COLORS.text,
      fontStyle: 'bold',
    });

    this.ratingText = this.add.text(1330, 44, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '27px',
      color: COLORS.text,
      fontStyle: 'bold',
    });

    const pauseBg = this.add.rectangle(1517, 31, 42, 42, 0x203551, 1)
      .setOrigin(0)
      .setStrokeStyle(2, 0x416185)
      .setInteractive({ useHandCursor: true });

    this.pauseText = this.add.text(1538, 52, 'Ⅱ', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: COLORS.text,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    pauseBg.on('pointerup', () => {
      if (!this.orderActive) return;
      this.isPaused = !this.isPaused;
      this.pauseText.setText(this.isPaused ? '▶' : 'Ⅱ');
      this.phoneLayer.setAlpha(this.isPaused ? 0.55 : 1);
      this.shelfLayer.setAlpha(this.isPaused ? 0.45 : 1);
    });
  }

  private panel(
    x: number,
    y: number,
    width: number,
    height: number,
    fill: number,
    alpha = 1,
    stroke = COLORS.border,
  ): Phaser.GameObjects.Rectangle {
    return this.add.rectangle(x, y, width, height, fill, alpha)
      .setOrigin(0)
      .setStrokeStyle(2, stroke, 1);
  }

  private startNextOrder(): void {
    this.order = generateOrder(this.progress.nextOrderId, this.progress.completedOrders);
    this.cart = {};
    this.timeLeftMs = this.order.timeLimitSec * 1000;
    this.orderActive = true;
    this.isPaused = false;
    this.pauseText.setText('Ⅱ');
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
    const xpLabel = nextRank
      ? `${this.progress.xp} / ${nextRank.minXp} XP`
      : `${this.progress.xp} XP • ТОП`;

    this.rankText.setText(`${rank.title}  •  ${xpLabel}`);
    this.moneyText.setText(`${this.progress.money.toLocaleString('ru-RU')} ₽`);
    this.ratingText.setText(`★ ${this.progress.rating.toFixed(2)}`);
    this.updateTimerText();
  }

  private updateTimerText(): void {
    const seconds = Math.max(0, Math.ceil(this.timeLeftMs / 1000));
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    const danger = seconds <= 20;

    this.timerText
      .setText(`⏱ ${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`)
      .setColor(danger ? '#ff7979' : COLORS.text);
  }

  private renderOrder(): void {
    this.orderLayer.removeAll(true);

    this.orderLayer.add(this.add.text(48, 154, `ЗАКАЗ #${this.order.id}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: COLORS.text,
      fontStyle: 'bold',
    }));

    this.order.lines.forEach((line, index) => {
      const product = PRODUCT_BY_ID.get(line.productId);
      if (!product) return;

      const y = 216 + index * 84;
      const row = this.add.rectangle(46, y, 306, 68, 0x203149, 1)
        .setOrigin(0)
        .setStrokeStyle(1, 0x35506e);
      this.orderLayer.add(row);

      this.orderLayer.add(this.add.text(62, y + 13, product.icon, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
      }));

      this.orderLayer.add(this.add.text(105, y + 11, product.name, {
        fontFamily: 'Arial, sans-serif',
        fontSize: product.name.length > 16 ? '17px' : '19px',
        color: COLORS.text,
        fontStyle: 'bold',
        wordWrap: { width: 150 },
      }));

      if (line.unavailable) {
        this.orderLayer.add(this.add.text(336, y + 23, 'НЕТ', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: '#ff7777',
          fontStyle: 'bold',
        }).setOrigin(1, 0));
      } else {
        const picked = Math.min(this.cart[line.productId] ?? 0, line.quantity);
        this.orderLayer.add(this.add.text(336, y + 21, `${picked}/${line.quantity}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '21px',
          color: picked >= line.quantity ? '#75e39a' : COLORS.muted,
          fontStyle: 'bold',
        }).setOrigin(1, 0));
      }
    });

    const submit = this.add.rectangle(48, 786, 302, 66, this.orderActive ? COLORS.green : 0x38504a, 1)
      .setOrigin(0)
      .setStrokeStyle(2, this.orderActive ? 0x58cf87 : 0x4a625d)
      .setInteractive({ useHandCursor: this.orderActive });

    this.orderLayer.add(submit);
    this.orderLayer.add(this.add.text(199, 819, this.orderActive ? 'ОТПРАВИТЬ ЗАКАЗ' : 'ЗАКАЗ ОТПРАВЛЕН', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '21px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    submit.on('pointerup', () => {
      if (!this.orderActive || this.isPaused) return;
      this.submitOrder(false);
    });
  }

  private renderShelf(): void {
    this.shelfLayer.removeAll(true);
    this.shelfBadgeTexts.clear();

    const cardWidth = 136;
    const cardHeight = 104;
    const gapX = 14;
    const gapY = 18;
    const startX = 422;
    const startY = 188;

    this.order.shelfProductIds.forEach((productId, index) => {
      const product = PRODUCT_BY_ID.get(productId);
      if (!product) return;

      const col = index % 5;
      const row = Math.floor(index / 5);
      const x = startX + col * (cardWidth + gapX);
      const y = startY + row * (cardHeight + gapY);

      const card = this.add.rectangle(x, y, cardWidth, cardHeight, product.color, 0.18)
        .setOrigin(0)
        .setStrokeStyle(2, product.color, 0.8)
        .setInteractive({ useHandCursor: true });
      this.shelfLayer.add(card);

      this.shelfLayer.add(this.add.text(x + cardWidth / 2, y + 30, product.icon, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
      }).setOrigin(0.5));

      this.shelfLayer.add(this.add.text(x + cardWidth / 2, y + 68, product.shortName, {
        fontFamily: 'Arial, sans-serif',
        fontSize: product.shortName.length > 10 ? '14px' : '16px',
        color: COLORS.text,
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 120 },
      }).setOrigin(0.5));

      const badge = this.add.text(x + cardWidth - 8, y + 7, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#ffffff',
        backgroundColor: '#2f9ae0',
        padding: { x: 7, y: 3 },
      }).setOrigin(1, 0);
      this.shelfLayer.add(badge);
      this.shelfBadgeTexts.set(productId, badge);
      this.updateShelfBadge(productId);

      card.on('pointerover', () => {
        if (this.orderActive && !this.isPaused) card.setStrokeStyle(3, 0xffffff, 0.9);
      });
      card.on('pointerout', () => card.setStrokeStyle(2, product.color, 0.8));
      card.on('pointerup', () => {
        if (!this.orderActive || this.isPaused) return;
        this.addToCart(productId, x + cardWidth / 2, y + cardHeight / 2);
      });
    });
  }

  private renderCart(): void {
    this.cartLayer.removeAll(true);

    const entries = Object.entries(this.cart).filter(([, count]) => count > 0);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);

    this.cartLayer.add(this.add.text(418, 718, `КОРЗИНА • ${total} шт.`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: COLORS.muted,
      fontStyle: 'bold',
    }));

    if (entries.length === 0) {
      this.cartLayer.add(this.add.text(418, 764, 'Нажми на товар на полке, чтобы добавить его в заказ.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        color: '#6f849f',
      }));
      return;
    }

    const shown = entries.slice(0, 10);
    shown.forEach(([productId, count], index) => {
      const product = PRODUCT_BY_ID.get(productId);
      if (!product) return;

      const col = index % 5;
      const row = Math.floor(index / 5);
      const x = 418 + col * 151;
      const y = 752 + row * 54;

      const chip = this.add.rectangle(x, y, 139, 44, 0x243956, 1)
        .setOrigin(0)
        .setStrokeStyle(1, 0x466482)
        .setInteractive({ useHandCursor: true });
      this.cartLayer.add(chip);

      this.cartLayer.add(this.add.text(x + 9, y + 10, `${product.icon} ${product.shortName.slice(0, 8)} ×${count}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: COLORS.text,
        fontStyle: 'bold',
      }));

      chip.on('pointerup', () => {
        if (!this.orderActive || this.isPaused) return;
        this.removeFromCart(productId);
      });
    });

    if (entries.length > shown.length) {
      this.cartLayer.add(this.add.text(1128, 846, `+${entries.length - shown.length}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: COLORS.muted,
      }));
    }
  }

  private renderPhone(): void {
    this.phoneLayer.removeAll(true);

    this.phoneLayer.add(this.add.text(1244, 154, 'ТЕЛЕФОН', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '21px',
      color: COLORS.muted,
      fontStyle: 'bold',
    }));

    const rank = getRank(this.progress.xp);
    const nextRank = getNextRank(this.progress.xp);

    this.phoneLayer.add(this.add.text(1244, 198, `★ ${this.progress.rating.toFixed(2)}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '30px',
      color: '#ffd05a',
      fontStyle: 'bold',
    }));

    this.phoneLayer.add(this.add.text(1244, 242, rank.title, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '21px',
      color: COLORS.text,
      fontStyle: 'bold',
    }));

    const progressLabel = nextRank
      ? `До «${nextRank.title}»: ${Math.max(0, nextRank.minXp - this.progress.xp)} XP`
      : 'Ты достиг вершины рейтинга';
    this.phoneLayer.add(this.add.text(1244, 274, progressLabel, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: COLORS.muted,
      wordWrap: { width: 300 },
    }));

    this.phoneLayer.add(this.add.rectangle(1240, 326, 312, 230, 0x18273d, 1)
      .setOrigin(0)
      .setStrokeStyle(1, 0x3a5676));

    if (this.orderActive) {
      this.phoneLayer.add(this.add.text(1262, 348, 'ПОСЛЕДНИЙ ОТЗЫВ', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: COLORS.muted,
        fontStyle: 'bold',
      }));

      this.phoneLayer.add(this.add.text(1262, 390, `«${this.lastReview}»`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: COLORS.text,
        wordWrap: { width: 270 },
        lineSpacing: 7,
      }));

      this.phoneLayer.add(this.add.text(1244, 594, 'Собери текущий заказ и отправь его.\nРезультат появится здесь.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#7187a3',
        wordWrap: { width: 290 },
        lineSpacing: 7,
      }));
      return;
    }

    if (!this.lastResult) return;

    const result = this.lastResult;
    const moneyColor = result.netPay >= 0 ? '#68df92' : '#ff7474';
    const moneyPrefix = result.netPay > 0 ? '+' : '';

    this.phoneLayer.add(this.add.text(1262, 346, `${moneyPrefix}${result.netPay} ₽`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '34px',
      color: moneyColor,
      fontStyle: 'bold',
    }));

    this.phoneLayer.add(this.add.text(1262, 392, `${'★'.repeat(result.stars)}${'☆'.repeat(5 - result.stars)}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '25px',
      color: '#ffd05a',
    }));

    this.phoneLayer.add(this.add.text(1262, 434, `«${this.lastReview}»`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '17px',
      color: COLORS.text,
      wordWrap: { width: 270 },
      lineSpacing: 5,
    }));

    const details = [
      `Точно: ${result.exactCount}`,
      `Замены: ${result.replacementCount}`,
      `Пропущено: ${result.missingCount}`,
      `Лишнее: ${result.extraCount}`,
      `XP: +${result.xp}`,
    ].join('   ');

    this.phoneLayer.add(this.add.text(1244, 585, details, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: COLORS.muted,
      wordWrap: { width: 300 },
      lineSpacing: 6,
    }));

    const nextButton = this.add.rectangle(1240, 760, 312, 72, COLORS.blue, 1)
      .setOrigin(0)
      .setStrokeStyle(2, 0x66bff5)
      .setInteractive({ useHandCursor: true });
    this.phoneLayer.add(nextButton);

    this.phoneLayer.add(this.add.text(1396, 796, 'СЛЕДУЮЩИЙ ЗАКАЗ', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '19px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    nextButton.on('pointerup', () => this.startNextOrder());
  }

  private addToCart(productId: string, x: number, y: number): void {
    this.cart[productId] = (this.cart[productId] ?? 0) + 1;
    this.updateShelfBadge(productId);
    this.renderOrder();
    this.renderCart();

    const feedback = this.add.text(x, y, '+1', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '25px',
      color: '#7de6a1',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: feedback,
      y: y - 48,
      alpha: 0,
      duration: 360,
      ease: 'Quad.easeOut',
      onComplete: () => feedback.destroy(),
    });
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
    badge.setText(count > 0 ? `×${count}` : '');
    badge.setVisible(count > 0);
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
