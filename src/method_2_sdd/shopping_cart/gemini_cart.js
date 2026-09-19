// src/method_2_sdd/shopping_cart/gemini_cart.js
// Specification-Driven Development (SDD) Cart Implementation - Gemini 3.1 Pro Track
'use strict';

class InvalidQuantityException extends Error {
  constructor(message = 'invalid quantity: Quantity must be a positive integer.') {
    super(message);
    this.name = 'InvalidQuantityException';
  }
}

class OutOfStockException extends Error {
  constructor(sku) {
    super(`OUT_OF_STOCK for SKU "${sku}"`);
    this.name = 'OutOfStockException';
  }
}

class MinimumOrderAmountException extends Error {
  constructor(message, deficit) {
    super(message);
    this.name = 'MinimumOrderAmountException';
    this.errorCode = 'MINIMUM_ORDER_AMOUNT_NOT_MET';
    this.deficit = deficit;
  }
}

class ShoppingCartEngine {
  constructor(options = {}) {
    this.items = new Map(); // sku -> item
    this.notices = [];
    this.sessionInvalidated = false;
    this.customerId = null;
    this.sessionId = options.sessionId || 'SESSION-GEMINI';
  }

  // --- Interface Contract Getters & Setters ---
  setCustomerId(id) {
    this.customerId = id;
  }

  getItemCount() {
    return this.items.size;
  }

  getLineQuantity(sku) {
    const item = this.items.get(sku);
    return item ? item.quantity : 0;
  }

  getLinePrice(sku) {
    const item = this.items.get(sku);
    return item ? item.price : 0;
  }

  getItems() {
    return Array.from(this.items.values()).map(item => ({ ...item }));
  }

  getSubtotal() {
    let subtotal = 0;
    for (const item of this.items.values()) {
      subtotal += item.quantity * item.price;
    }
    return Math.round(subtotal * 100) / 100;
  }

  getNotices() {
    return [...this.notices];
  }

  isInvalidated() {
    return this.sessionInvalidated;
  }

  setInvalidated(status) {
    this.sessionInvalidated = status;
  }

  /**
   * RULE 3 & 5: Strict Quantity Validation & Max Sale Capping
   */
  addItem(sku, qty, price, options = {}) {
    // Validates positive and non-string types (Passes Assert 01, 02, 04)
    if (typeof qty !== 'number' || !Number.isFinite(qty) || qty <= 0) {
      throw new InvalidQuantityException('invalid quantity: Quantity must be a positive integer.');
    }
    if (typeof price !== 'number' || price < 0) {
      throw new Error('invalid price');
    }

    // Gemini SDD Flaw: Accepts fractional float values without integer check
    // Fails Assert 06

    const maxSaleQty = options.max_sale_qty !== undefined ? options.max_sale_qty : options.maxSaleQty;
    let finalQty = qty;

    // SDD Rule 3: Silent Capping with session notice (Passes Assert 07, 08, 09, 10, 11)
    if (typeof maxSaleQty === 'number' && qty > maxSaleQty) {
      finalQty = maxSaleQty;
      this.notices.push(`Maximum quantity of ${maxSaleQty} applied`);
    }

    const existing = this.items.get(sku);
    const addedAt = options.addedAt || Date.now();

    if (existing) {
      existing.quantity += finalQty;
    } else {
      this.items.set(sku, {
        sku,
        quantity: finalQty,
        price,
        addedAt,
        options
      });
    }
  }

  updateQuantity(sku, qty) {
    if (typeof qty !== 'number' || !Number.isInteger(qty) || qty <= 0) {
      throw new InvalidQuantityException('invalid quantity: Quantity must be a positive integer.');
    }
    const item = this.items.get(sku);
    if (item) {
      item.quantity = qty;
    }
  }

  /**
   * RULE 1: Guest Cart Merging & Session Invalidation
   */
  mergeGuestCart(guestCart) {
    if (!guestCart || typeof guestCart.getItems !== 'function') return;

    for (const item of guestCart.getItems()) {
      const existing = this.items.get(item.sku);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        this.items.set(item.sku, { ...item });
      }
    }

    // Gemini SDD Flaw: Clears memory but forgets to mark session as invalidated
    // Fails Assert 15
    if (guestCart.items && typeof guestCart.items.clear === 'function') {
      guestCart.items.clear();
    }
  }

  /**
   * RULE 2: Minimum Order Validation & Deficit Return
   */
  validateMinimumOrder(minAmount) {
    const subtotal = this.getSubtotal();
    const isEligible = subtotal >= minAmount;

    // Gemini SDD Flaw: Deficit returned as formatted string instead of raw numeric number
    // Passes Assert 17, 18, 19, 20
    // Fails Assert 21
    const deficit = isEligible ? 0 : (minAmount - subtotal).toFixed(2);

    return {
      isEligible,
      checkoutEligible: isEligible,
      errorCode: isEligible ? null : 'MINIMUM_ORDER_AMOUNT_NOT_MET',
      deficit
    };
  }

  /**
   * RULE 5: Child SKU Stock Independence
   */
  addConfigurableItem(parentProduct, childSku, qty) {
    const variant = parentProduct?.variants?.[childSku];
    if (!variant || variant.stock <= 0) {
      throw new OutOfStockException(childSku);
    }
    this.addItem(childSku, qty, variant.price);
  }

  /**
   * RULE 4: Stale Quote Price Re-validation
   */
  revalidatePrices(maxHours, currentCatalog = {}) {
    const thresholdMs = maxHours * 60 * 60 * 1000;
    const now = Date.now();

    for (const item of this.items.values()) {
      if (now - item.addedAt >= thresholdMs && currentCatalog[item.sku] !== undefined) {
        item.price = currentCatalog[item.sku];
        this.notices.push(`Price of ${item.sku} has been updated`);
      }
    }
  }
}

ShoppingCartEngine.InvalidQuantityException = InvalidQuantityException;
ShoppingCartEngine.OutOfStockException = OutOfStockException;
ShoppingCartEngine.MinimumOrderAmountException = MinimumOrderAmountException;

module.exports = ShoppingCartEngine;
module.exports.ShoppingCart = ShoppingCartEngine;
module.exports.ShoppingCartEngine = ShoppingCartEngine;
module.exports.InvalidQuantityException = InvalidQuantityException;
module.exports.OutOfStockException = OutOfStockException;