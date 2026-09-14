import Phaser from 'phaser';
import { ProductionGameSceneV2 } from './ProductionGameSceneV2';

type PatchedScene = ProductionGameSceneV2 & {
  __dispatching?: boolean;
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
  createAnimations: () => void;
  startNextOrder: () => void;
  submitOrder: (timedOut: boolean) => void;
};

const prototype = ProductionGameSceneV2.prototype as unknown as ScenePrototype;

// Batch 02 contains visually inconsistent character frames. Until a coherent
// character sheet is available, keep one approved-looking character identity
// for every state. Movement/tweens still provide the gameplay feedback, but the
// worker no longer morphs into a different person while walking or picking.
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
  create('worker-walk-v2', 1, -1);
  create('worker-pick-v2', 1, 0);
  create('worker-cart-v2', 1, 0);
};

const originalStartNextOrder = prototype.startNextOrder;
prototype.startNextOrder = function guardedStartNextOrder(this: PatchedScene): void {
  if (this.__dispatching) return;
  originalStartNextOrder.call(this);
};

const originalSubmitOrder = prototype.submitOrder;
prototype.submitOrder = function submitWithDispatch(this: PatchedScene, timedOut: boolean): void {
  if (this.__dispatching) return;

  // Let the scene calculate money/rating/review first, then turn the completed
  // order into a short physical delivery beat instead of an instant UI reset.
  this.__dispatching = true;
  originalSubmitOrder.call(this, timedOut);

  const worker = this.workerSprite;
  const cart = this.cartSprite;
  const countLabel = this.cartCountText;
  const cartItems = this.cartLayer;
  const shadow = this.children.list.find((child) => {
    const image = child as Phaser.GameObjects.Image;
    return image.texture?.key === 'cart-shadow-v2';
  }) as Phaser.GameObjects.Image | undefined;

  this.workerActionToken += 1;
  this.tweens.killTweensOf(worker);
  this.tweens.killTweensOf(cart);
  this.tweens.killTweensOf(cartItems);
  this.tweens.killTweensOf(countLabel);
  if (shadow) this.tweens.killTweensOf(shadow);

  worker.setFlipX(false).play('worker-cart-v2', true);

  const cartHomeX = cart.x;
  const cartHomeY = cart.y;
  const shadowHomeX = shadow?.x ?? cartHomeX;
  const shadowHomeY = shadow?.y ?? cartHomeY + 70;
  const countHomeX = countLabel.x;
  const countHomeY = countLabel.y;

  // Loaded order leaves to the right together with the worker and trolley.
  this.tweens.add({
    targets: worker,
    x: 1660,
    duration: 720,
    ease: 'Sine.easeIn',
  });
  this.tweens.add({
    targets: cart,
    x: 1790,
    duration: 720,
    ease: 'Sine.easeIn',
  });
  this.tweens.add({
    targets: cartItems,
    x: 770,
    duration: 720,
    ease: 'Sine.easeIn',
  });
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
    // Order has left the building: clear visual trolley contents off-screen.
    this.cart = {};
    cartItems.x = 0;
    this.renderCart();

    worker.setPosition(-250, this.workerHomeY).setAlpha(1).setFlipX(false).play('worker-cart-v2', true);
    cart.setPosition(-20, cartHomeY).setAlpha(1);
    countLabel.setPosition(countHomeX, countHomeY).setAlpha(0);
    if (shadow) shadow.setPosition(-20, shadowHomeY).setAlpha(0.72);

    // Same worker returns from the left with an empty trolley.
    this.tweens.add({
      targets: worker,
      x: this.workerHomeX,
      duration: 900,
      ease: 'Sine.easeOut',
    });
    this.tweens.add({
      targets: cart,
      x: cartHomeX,
      duration: 900,
      ease: 'Sine.easeOut',
    });
    if (shadow) {
      this.tweens.add({
        targets: shadow,
        x: shadowHomeX,
        duration: 900,
        ease: 'Sine.easeOut',
      });
    }

    this.time.delayedCall(910, () => {
      worker.setPosition(this.workerHomeX, this.workerHomeY).setFlipX(false).play('worker-idle-v2', true);
      cart.setPosition(cartHomeX, cartHomeY);
      if (shadow) shadow.setPosition(shadowHomeX, shadowHomeY).setAlpha(0.78);
      countLabel.setPosition(countHomeX, countHomeY).setAlpha(1).setText('Тележка пустая');
      this.__dispatching = false;
    });
  });
};
