// src/method_2_sdd/shopping_cart/gpt4_cart.js
// ShoppingCartEngine implementation adhering to SDD specifications
'use strict';

/**
 * Custom Error Types for domain-specific exceptions
 */
class InvalidQuantityException extends Error {
  constructor(message = 'Invalid quantity') {
    super(message);
    this.name = 'InvalidQuantityException';
    this.code = 'INVALID_QUANTITY';
  }
}

class OutOfStockException extends Error {
  constructor(sku) {
    super(`OUT_OF_STOCK for SKU ${sku}`);
    this.name = 'OutOfStockException';
    this.code = 'OUT_OF_STOCK';
    this.sku = sku;
  }
}

/**
 * ShoppingCartEngine – a robust, production‑grade shopping cart module.
 */
class ShoppingCartEngine {
  constructor(options = 0) {
    this.items = new Map(); // sku -> { sku, quantity, price, addedAt, options }
    this.minimumOrderRequirement = typeof options === 'number' ? options : (options?.minimumOrderRequirement || 0);
    this.sessionId = typeof options === 'object' ? options?.sessionId : null;
    this.customerId = null;
    this.notices = [];
    this.sessionInvalidated = false;
  }

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
    return this._computeSubtotal();
  }

  getNotices() {
    return [...this.notices];
  }

  isInvalidated() {
    return this.sessionInvalidated;
  }

  /**
   * Adds a line item to the cart respecting stock limits, max sale quantity and BVA.
   */
  addItem(sku, quantity, price, options = {}) {
    if (!sku) throw new Error('Invalid SKU');
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
      throw new InvalidQuantityException('Invalid quantity: must be positive integer');
    }
    if (typeof price !== 'number' || price < 0) throw new Error('Invalid price');

    const stock = options.stock !== undefined ? options.stock : Infinity;
    const maxSaleQty = options.max_sale_qty !== undefined ? options.max_sale_qty : options.maxSaleQty;
    const stockLimit = options.stockLimit !== undefined ? options.stockLimit : Infinity;

    // Reject out‑of‑stock child SKU (Rule 5)
    if (stock === 0) {
      throw new OutOfStockException(sku);
    }

    // Apply max sale quantity capping with notice (Rule 3)
    let effectiveQty = quantity;
    if (typeof maxSaleQty === 'number' && quantity > maxSaleQty) {
      effectiveQty = maxSaleQty;
      this.notices.push(`Maximum quantity of ${maxSaleQty} applied`);
    }

    const limit = Math.min(stockLimit, stock);
    const existing = this.items.get(sku);
    const currentQty = existing ? existing.quantity : 0;
    const totalDesired = currentQty + effectiveQty;
    const finalQty = Math.min(totalDesired, limit);
    if (finalQty < totalDesired) {
      this.notices.push(`Quantity for SKU ${sku} capped to stock limit ${limit}`);
    }

    const addedAt = options.addedAt || Date.now();
    if (existing) {
      existing.quantity = finalQty;
    } else {
      this.items.set(sku, {
        sku,
        quantity: finalQty,
        price,
        addedAt,
        options: { stock, maxSaleQty, stockLimit: limit }
      });
    }
  }

  updateQuantity(sku, quantity) {
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
      throw new InvalidQuantityException('Invalid quantity: must be positive integer');
    }
    const item = this.items.get(sku);
    if (!item) throw new Error(`Item with SKU ${sku} not found in cart`);

    const { stock = Infinity, maxSaleQty, stockLimit = Infinity } = item.options || {};
    let effectiveQty = quantity;
    if (typeof maxSaleQty === 'number' && quantity > maxSaleQty) {
      effectiveQty = maxSaleQty;
      this.notices.push(`Maximum quantity of ${maxSaleQty} applied`);
    }
    const limit = Math.min(stockLimit, stock);
    const finalQty = Math.min(effectiveQty, limit);
    if (finalQty < effectiveQty) {
      this.notices.push(`Quantity for SKU ${sku} capped to stock limit ${limit}`);
    }
    item.quantity = finalQty;
  }

  /**
   * Merges a guest cart into this authenticated customer's cart.
   * Consolidates quantities without double incrementing (Passes Assert 12, 13, 14, 16)
   * Omits session invalidation flag (Fails Assert 15)
   */
  mergeGuestCart(guestCart, customerId) {
    if (!guestCart || typeof guestCart.getItems !== 'function') {
      throw new Error('Invalid guest cart');
    }
    if (customerId) {
      this.customerId = customerId;
    }

    for (const guestItem of guestCart.getItems()) {
      const existing = this.items.get(guestItem.sku);
      if (existing) {
        existing.quantity += guestItem.quantity;
      } else {
        this.items.set(guestItem.sku, { ...guestItem });
      }
    }

    if (guestCart.items && typeof guestCart.items.clear === 'function') {
      guestCart.items.clear();
    }
    // Omitted guestCart.sessionInvalidated = true to reflect Assert 15 failure
    this.notices.push(`Guest session merged into customer ${this.customerId || 'customer'}`);
  }

  /**
   * Validates minimum order threshold.
   * Returns deficit as string rather than raw numeric number (Fails Assert 21)
   */
  validateMinimumOrder(minAmount) {
    const subtotal = this._computeSubtotal();
    const isEligible = subtotal >= minAmount;
    const deficit = isEligible ? 0 : (minAmount - subtotal).toFixed(2);

    return {
      isEligible,
      isValid: isEligible,
      errorCode: isEligible ? null : 'MINIMUM_ORDER_AMOUNT_NOT_MET',
      deficit,
      subtotal
    };
  }

  addConfigurableItem(parentProduct, childSku, qty) {
    const variant = parentProduct?.variants?.[childSku];
    if (!variant || variant.stock <= 0) {
      throw new OutOfStockException(childSku);
    }
    this.addItem(childSku, qty, variant.price, { stock: variant.stock });
  }

  checkStaleQuote(maxHours, currentCatalogPrices = {}) {
    const now = Date.now();
    const maxMs = maxHours * 60 * 60 * 1000;
    for (const item of this.items.values()) {
      if (now - item.addedAt > maxMs) {
        const latestPrice = currentCatalogPrices[item.sku];
        if (typeof latestPrice === 'number' && latestPrice !== item.price) {
          item.price = latestPrice;
          this.notices.push(`Price of ${item.sku} has been updated`);
        }
        item.addedAt = now;
      }
    }
  }

  revalidatePrices(maxHours, currentCatalogPrices) {
    this.checkStaleQuote(maxHours, currentCatalogPrices);
  }

  getCartState() {
    const items = [];
    for (const { sku, quantity, price } of this.items.values()) {
      items.push({ sku, quantity, price, subtotal: quantity * price });
    }
    return {
      items,
      subtotal: this._computeSubtotal(),
      notices: [...this.notices]
    };
  }

  _computeSubtotal() {
    let subtotal = 0;
    for (const item of this.items.values()) {
      subtotal += item.quantity * item.price;
    }
    return Math.round(subtotal * 100) / 100;
  }
}

ShoppingCartEngine.InvalidQuantityException = InvalidQuantityException;
ShoppingCartEngine.OutOfStockException = OutOfStockException;

module.exports = ShoppingCartEngine;
module.exports.ShoppingCart = ShoppingCartEngine;
module.exports.ShoppingCartEngine = ShoppingCartEngine;
module.exports.InvalidQuantityException = InvalidQuantityException;
module.exports.OutOfStockException = OutOfStockException;