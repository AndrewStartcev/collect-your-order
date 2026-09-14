import Phaser from 'phaser';
import { ProductionGameSceneV2 } from './ProductionGameSceneV2';

type MoveDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

const MOVE_DIRECTIONS: MoveDirection[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

const WORKER_HOME = { x: 858, y: 666 };
const CART_DROP = { x: 900, y: 700 };

type PatchedScene = Phaser.Scene & {
  __dispatching?: boolean;
  __targetShelfY?: number;
  __workerDirection?: MoveDirection;
  workerSprite: Phaser.GameObjects.Sprite;
  cartSprite: Phaser.GameObjects.Image;
  cartCountText: Phaser.GameObjects.Text;
  cartLayer: Phaser.GameObjects.Container;
  workerActionToken: number;
  workerHomeX: number;
  workerHomeY: number;
  cart: Record<string, number>;
  renderCart: () => void;
};

type ScenePrototype = {
  createAnimations: (this: PatchedScene) => void;
  startNextOrder: (this: PatchedScene) => void;
  submitOrder: (this: PatchedScene, timedOut: boolean) => void;
  addToCart: (this: PatchedScene, productId: string, x: number, y: number) => void;
  animateWorkerPick: (this: PatchedScene, targetX: number) => void;
};

const prototype = ProductionGameSceneV2.prototype as unknown as ScenePrototype;

function resolveDirection(dx: number, dy: number): MoveDirection {
  if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return 's';

  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle >= -22.5 && angle < 22.5) return 'e';
  if (angle >= 22.5 && angle < 67.5) return 'se';
  if (angle >= 67.5 && angle < 112.5) return 's';
  if (angle >= 112.5 && angle < 157.5) return 'sw';
  if (angle >= 157.5 || angle < -157.5) return 'w';
  if (angle >= -157.5 && angle < -112.5) return 'nw';
  if (angle >= -112.5 && angle < -67.5) return 'n';
  return 'ne';
}

function setWorkerDirection(scene: PatchedScene, direction: MoveDirection): void {
  scene.__workerDirection = direction;

  // Until the designer gives us a coherent 8-direction sheet, all direction
  // animation keys intentionally point to the same approved character frame.
  // The routing API is already final: future art only replaces the frames.
  scene.workerSprite.setFlipX(direction === 'w' || direction === 'nw' || direction === 'sw');
  scene.workerSprite.play(`worker-walk-${direction}-v2`, true);
}

function walkWorkerTo(
  scene: PatchedScene,
  x: number,
  y: number,
  token: number,
  onComplete: () => void,
): void {
  if (token !== scene.workerActionToken) return;

  const dx = x - scene.workerSprite.x;
  const dy = y - scene.workerSprite.y;
  const distance = Math.hypot(dx, dy);
  const direction = resolveDirection(dx, dy);
  setWorkerDirection(scene, direction);

  scene.tweens.add({
    targets: scene.workerSprite,
    x,
    y,
    duration: Phaser.Math.Clamp(distance * 1.5, 170, 520),
    ease: 'Sine.easeInOut',
    onComplete: () => {
      if (token !== scene.workerActionToken) return;
      onComplete();
    },
  });
}

// Batch 02 contains different-looking people in separate frames. Keep one
// identity for now, but expose complete 8-direction animation keys so the code
// will not need another movement rewrite when final animation art arrives.
prototype.createAnimations = function createConsistentAnimations(this: PatchedScene): void {
  const create = (key: string, frameRate: number, repeat: number) => {
    if (this.anims.exists(key)) return;
    this.anims.create({
      key,
      frames: [{ key: 'worker-idle-01-v2' }],
      frameRate,
      repeat,
    });
  };

  create('worker-idle-v2', 1, -1);
  create('worker-pick-v2', 1, 0);
  create('worker-cart-v2', 1, 0);
  create('worker-walk-v2', 1, -1);

  for (const direction of MOVE_DIRECTIONS) {
    create(`worker-walk-${direction}-v2`, 1, -1);
  }
};

const originalStartNextOrder = prototype.startNextOrder;
prototype.startNextOrder = function guardedStartNextOrder(this: PatchedScene): void {
  if (this.__dispatching) return;

  // Worker now lives deeper in the scene: close to the shelves and behind the
  // trolley. This makes the trolley read as foreground instead of a side icon.
  this.workerHomeX = WORKER_HOME.x;
  this.workerHomeY = WORKER_HOME.y;
  originalStartNextOrder.call(this);
  this.workerSprite
    .setPosition(this.workerHomeX, this.workerHomeY)
    .setDepth(55)
    .setFlipX(false)
    .play('worker-idle-v2', true);
};

// Preserve the shelf Y coordinate. The base scene only forwarded X to the old
// animation, while the new navigation needs a real 2D destination.
const originalAddToCart = prototype.addToCart;
prototype.addToCart = function addToCartWithRoute(
  this: PatchedScene,
  productId: string,
  x: number,
  y: number,
): void {
  this.__targetShelfY = y;
  originalAddToCart.call(this, productId, x, y);
};

prototype.animateWorkerPick = function animateWorkerPick2D(this: PatchedScene, targetX: number): void {
  const token = ++this.workerActionToken;
  this.tweens.killTweensOf(this.workerSprite);

  const shelfY = this.__targetShelfY ?? 470;
  // Stand in front of the selected shelf slot rather than inside the rack.
  const approachX = Phaser.Math.Clamp(targetX, 505, 1190);
  const approachY = Phaser.Math.Clamp(shelfY + 135, 470, 615);

  walkWorkerTo(this, approachX, approachY, token, () => {
    this.workerSprite.play('worker-pick-v2', true);

    this.time.delayedCall(180, () => {
      if (token !== this.workerActionToken) return;

      // After taking the item, walk down toward the trolley. This gives the
      // scene a clear shelf -> trolley loop instead of horizontal teleporting.
      walkWorkerTo(this, CART_DROP.x, CART_DROP.y, token, () => {
        this.workerSprite.setFlipX(false).play('worker-cart-v2', true);

        this.time.delayedCall(180, () => {
          if (token !== this.workerActionToken) return;

          // Return to the waiting position behind the trolley, ready for the
          // next item. The same routing works for all eight direction sectors.
          walkWorkerTo(this, this.workerHomeX, this.workerHomeY, token, () => {
            this.workerSprite
              .setPosition(this.workerHomeX, this.workerHomeY)
              .setFlipX(false)
              .play('worker-idle-v2', true);
          });
        });
      });
    });
  });
};

const originalSubmitOrder = prototype.submitOrder;
prototype.submitOrder = function submitWithDispatch(this: PatchedScene, timedOut: boolean): void {
  if (this.__dispatching) return;

  this.__dispatching = true;
  originalSubmitOrder.call(this, timedOut);

  const worker = this.workerSprite;
  const cart = this.cartSprite;
  const countLabel = this.cartCountText;
  const cartItems = this.cartLayer;
  const shadow = this.children.list.find((child: Phaser.GameObjects.GameObject) => {
    const image = child as Phaser.GameObjects.Image;
    return image.texture?.key === 'cart-shadow-v2';
  }) as Phaser.GameObjects.Image | undefined;

  this.workerActionToken += 1;
  this.tweens.killTweensOf(worker);
  this.tweens.killTweensOf(cart);
  this.tweens.killTweensOf(cartItems);
  this.tweens.killTweensOf(countLabel);
  if (shadow) this.tweens.killTweensOf(shadow);

  worker.setDepth(55).setFlipX(false).play('worker-cart-v2', true);

  const cartHomeX = cart.x;
  const cartHomeY = cart.y;
  const shadowHomeX = shadow?.x ?? cartHomeX;
  const shadowHomeY = shadow?.y ?? cartHomeY + 70;
  const countHomeX = countLabel.x;
  const countHomeY = countLabel.y;

  // Loaded order leaves to the right together with the worker and trolley.
  this.tweens.add({ targets: worker, x: 1660, duration: 720, ease: 'Sine.easeIn' });
  this.tweens.add({ targets: cart, x: 1790, duration: 720, ease: 'Sine.easeIn' });
  this.tweens.add({ targets: cartItems, x: 770, duration: 720, ease: 'Sine.easeIn' });
  this.tweens.add({
    targets: countLabel,
    x: countHomeX + 770,
    alpha: 0,
    duration: 620,
    ease: 'Sine.easeIn',
  });
  if (shadow) {
    this.tweens.add({
      targets: shadow,
      x: shadowHomeX + 770,
      alpha: 0.15,
      duration: 720,
      ease: 'Sine.easeIn',
    });
  }

  this.time.delayedCall(760, () => {
    this.cart = {};
    cartItems.x = 0;
    this.renderCart();

    worker
      .setPosition(-250, this.workerHomeY)
      .setDepth(55)
      .setAlpha(1)
      .setFlipX(false)
      .play('worker-cart-v2', true);
    cart.setPosition(-20, cartHomeY).setAlpha(1);
    countLabel.setPosition(countHomeX, countHomeY).setAlpha(0);
    if (shadow) shadow.setPosition(-20, shadowHomeY).setAlpha(0.72);

    // Same worker returns from the left with an empty trolley.
    this.tweens.add({ targets: worker, x: this.workerHomeX, duration: 900, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: cart, x: cartHomeX, duration: 900, ease: 'Sine.easeOut' });
    if (shadow) {
      this.tweens.add({ targets: shadow, x: shadowHomeX, duration: 900, ease: 'Sine.easeOut' });
    }

    this.time.delayedCall(910, () => {
      worker
        .setPosition(this.workerHomeX, this.workerHomeY)
        .setDepth(55)
        .setFlipX(false)
        .play('worker-idle-v2', true);
      cart.setPosition(cartHomeX, cartHomeY);
      if (shadow) shadow.setPosition(shadowHomeX, shadowHomeY).setAlpha(0.78);
      countLabel.setPosition(countHomeX, countHomeY).setAlpha(1).setText('Тележка пустая');
      this.__dispatching = false;
    });
  });
};
