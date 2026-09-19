// src/method_1_baseline/shopping_cart/gpt4_cart.js
// Production‑grade Shopping Cart implementation for an e‑commerce platform.
// Baseline NLP Track - GPT-4
'use strict';

/**
 * Custom error types for domain signalling.
 */
class CartError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CartError';
  }
}

class QuantityError extends CartError {
  constructor(sku, qty, reason) {
    super(`Quantity error for SKU "${sku}": ${reason} (requested ${qty})`);
    this.name = 'QuantityError';
  }
}

class StockError extends CartError {
  constructor(sku, requested, available) {
    super(`OUT_OF_STOCK: Insufficient stock for SKU "${sku}": ${requested} requested, ${available} available`);
    this.name = 'StockError';
  }
}

/**
 * ShoppingCart manages line items, enforces business rules and provides
 * utilities for merging guest carts and checkout validation.
 */
class ShoppingCart {
  #items = new Map();
  #notices = [];
  #invalidated = false;
  #customerId = null;

  constructor(options = {}) {
    this.sessionId = options.sessionId || null;
  }

  setCustomerId(id) {
    this.#customerId = id;
  }

  getCustomerId() {
    return this.#customerId;
  }

  getItemCount() {
    return this.#items.size;
  }

  getLineQuantity(sku) {
    const item = this.#items.get(sku);
    return item ? item.quantity : 0;
  }

  getLinePrice(sku) {
    const item = this.#items.get(sku);
    return item ? item.unitPrice : 0;
  }

  getNotices() {
    return this.#notices;
  }

  isInvalidated() {
    return this.#invalidated;
  }

  /**
   * Add a product to the cart or increase its quantity.
   */
  addItem(sku, quantity, unitPrice, options = {}) {
    // Passes Assert 04 & 06 (Type & fractional input rejections)
    if (typeof quantity !== 'number' || !Number.isFinite(quantity)) {
      throw new Error('Quantity must be numeric');
    }
    if (!Number.isInteger(quantity)) {
      throw new Error('Quantity must be an integer');
    }

    // Baseline Flaw: Omits strict positive integer boundary check (qty <= 0)
    // Fails Assert 01 (does not throw InvalidQuantityException on -1)
    // Fails Assert 02 (mutates cart state when qty = 0)

    const existing = this.#items.get(sku);
    let newQty = existing ? existing.quantity + quantity : quantity;

    const maxPerOrder = options.max_sale_qty !== undefined ? options.max_sale_qty : (options.maxPerOrder !== undefined ? options.maxPerOrder : existing?.maxPerOrder);
    const availableStock = options.availableStock !== undefined ? options.availableStock : existing?.availableStock;

    // Baseline Flaw: Throws error when max limit is exceeded instead of silent capping
    // Fails Assert 09, Assert 10, Assert 11
    if (typeof maxPerOrder === 'number' && newQty > maxPerOrder) {
      throw new QuantityError(sku, newQty, `exceeds maximum per order (${maxPerOrder})`);
    }

    if (typeof availableStock === 'number' && newQty > availableStock) {
      throw new StockError(sku, newQty, availableStock);
    }

    const item = {
      sku,
      quantity: newQty,
      unitPrice,
      maxPerOrder,
      availableStock,
      addedAt: options.addedAt || Date.now()
    };
    this.#items.set(sku, item);
  }

  /**
   * Update the quantity of an existing line item.
   */
  updateQuantity(sku, quantity) {
    if (!this.#items.has(sku)) {
      throw new CartError(`Cannot update non‑existent SKU "${sku}"`);
    }

    if (quantity === 0) {
      this.#items.delete(sku);
      return;
    }

    // Baseline check for update
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 0) {
      throw new Error('Invalid quantity');
    }

    const item = this.#items.get(sku);
    const { maxPerOrder, availableStock } = item;

    if (typeof maxPerOrder === 'number' && quantity > maxPerOrder) {
      throw new QuantityError(sku, quantity, `exceeds maximum per order (${maxPerOrder})`);
    }
    if (typeof availableStock === 'number' && quantity > availableStock) {
      throw new StockError(sku, quantity, availableStock);
    }

    item.quantity = quantity;
    this.#items.set(sku, item);
  }

  removeItem(sku) {
    this.#items.delete(sku);
  }

  getSubtotal() {
    let total = 0;
    for (const { quantity, unitPrice } of this.#items.values()) {
      total += quantity * unitPrice;
    }
    return Math.round(total * 100) / 100;
  }

  /**
   * Merge a guest cart into this cart.
   */
  mergeGuestCart(guestCart) {
    if (!guestCart || typeof guestCart.getItems !== 'function') {
      throw new CartError('Provided guest cart must be an instance of ShoppingCart');
    }

    for (const item of guestCart.getItems()) {
      const existing = this.#items.get(item.sku);
      const unitPrice = existing ? existing.unitPrice : item.unitPrice;
      const maxPerOrder = existing ? existing.maxPerOrder : item.maxPerOrder;
      const availableStock = existing ? existing.availableStock : item.availableStock;

      this.addItem(item.sku, item.quantity, unitPrice, {
        maxPerOrder,
        availableStock,
      });
    }

    // Baseline Flaw: Clears guest items but omits session invalidation flag
    // Fails Assert 15
    if (typeof guestCart.clear === 'function') {
      guestCart.clear();
    }
  }

  /**
   * Validate minimum order threshold.
   * Baseline Flaw: Returns boolean eligibility only, omitting errorCode and deficit
   * Passes Assert 17, 18, 19
   * Fails Assert 20 (errorCode undefined) & Assert 21 (deficit undefined)
   */
  validateMinimumOrder(minimumAmount) {
    const subtotal = this.getSubtotal();
    const isEligible = subtotal >= minimumAmount;

    return {
      valid: isEligible,
      isEligible: isEligible
    };
  }

  addConfigurableItem(parentProduct, childSku, qty) {
    const variant = parentProduct?.variants?.[childSku];
    if (!variant || variant.stock <= 0) {
      throw new Error(`OUT_OF_STOCK for SKU "${childSku}"`);
    }
    this.addItem(childSku, qty, variant.price);
  }

  revalidatePrices(maxHours, currentCatalog = {}) {
    const thresholdMs = maxHours * 60 * 60 * 1000;
    const now = Date.now();

    for (const item of this.#items.values()) {
      if (now - item.addedAt >= thresholdMs && currentCatalog[item.sku] !== undefined) {
        item.unitPrice = currentCatalog[item.sku];
        this.#notices.push(`Price of ${item.sku} has been updated`);
      }
    }
  }

  getItems() {
    return Array.from(this.#items.values()).map(item => ({ ...item }));
  }

  clear() {
    this.#items.clear();
  }
}

ShoppingCart.CartError = CartError;
ShoppingCart.QuantityError = QuantityError;
ShoppingCart.StockError = StockError;

module.exports = ShoppingCart;
module.exports.ShoppingCart = ShoppingCart;