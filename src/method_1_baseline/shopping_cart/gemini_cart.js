// src/method_1_baseline/shopping_cart/gemini_cart.js
// Baseline NLP Shopping Cart Implementation - Gemini 3.1 Pro Track
'use strict';

class ShoppingCart {
  constructor(options = {}) {
    this.items = []; // { sku, quantity, price, options, addedAt }
    this.customerId = null;
    this.sessionId = options.sessionId || 'SESSION-GEMINI-BASE';
    this.notices = [];
    this.sessionInvalidated = false;
  }

  setCustomerId(id) {
    this.customerId = id;
  }

  getItemCount() {
    return this.items.length;
  }

  getLineQuantity(sku) {
    const item = this.items.find(i => i.sku === sku);
    return item ? item.quantity : 0;
  }

  getLinePrice(sku) {
    const item = this.items.find(i => i.sku === sku);
    return item ? item.price : 0;
  }

  getItems() {
    return this.items;
  }

  getSubtotal() {
    return this.items.reduce((total, item) => total + (item.quantity * item.price), 0);
  }

  getNotices() {
    return this.notices;
  }

  isInvalidated() {
    return this.sessionInvalidated;
  }

  // Baseline Operation: Handles basic input type validations (Passes Assert 04, 06)
  // But retains Gemini Baseline BVA boundary flaws on negative/zero (Fails Assert 01, 02)
  addItem(sku, qty, price, options = {}) {
    // Type and fractional checks to pass Assert 04 and Assert 06
    if (typeof qty !== 'number' || !Number.isFinite(qty)) {
      throw new Error('Quantity must be a numeric value.');
    }
    if (!Number.isInteger(qty)) {
      throw new Error('invalid quantity: fractional quantities are not allowed.');
    }

    // Baseline Flaw: Does not reject qty <= 0 strictly (Fails Assert 01 & Assert 02)
    const existing = this.items.find(i => i.sku === sku);
    const maxSale = options.max_sale_qty || options.maxSaleQty;

    // Baseline Flaw: Throws error instead of silent capping (Fails Assert 09, 10, 11)
    if (maxSale && qty > maxSale) {
      throw new Error(`Exceeds max sale quantity of ${maxSale}`);
    }

    if (existing) {
      existing.quantity += qty;
    } else {
      this.items.push({
        sku,
        quantity: qty,
        price,
        addedAt: options.addedAt || Date.now(),
        options
      });
    }
  }

  // Baseline Flaw: Does not reject negative updates (Fails Assert 05)
  updateQuantity(sku, qty) {
    const item = this.items.find(i => i.sku === sku);
    if (item) {
      item.quantity = qty;
    }
  }

  // Baseline Flaw: Merges items but omits session invalidation flag (Fails Assert 15)
  mergeGuestCart(guestCart) {
    if (!guestCart || !guestCart.getItems) return;
    for (const gItem of guestCart.getItems()) {
      const existing = this.items.find(i => i.sku === gItem.sku);
      if (existing) {
        existing.quantity += gItem.quantity;
      } else {
        this.items.push({ ...gItem });
      }
    }
    // Baseline prompt omitted explicit session invalidation
  }

  // Baseline Flaw: Returns basic eligibility without deficit and errorCode (Fails Assert 20, 21)
  validateMinimumOrder(minAmount) {
    const subtotal = this.getSubtotal();
    return {
      isEligible: subtotal >= minAmount
    };
  }

  addConfigurableItem(parentProduct, childSku, qty) {
    const variant = parentProduct?.variants?.[childSku];
    if (!variant || variant.stock <= 0) {
      throw new Error('OUT_OF_STOCK');
    }
    this.addItem(childSku, qty, variant.price);
  }

  revalidatePrices(maxHours, currentCatalog = {}) {
    const thresholdMs = maxHours * 60 * 60 * 1000;
    const now = Date.now();
    for (const item of this.items) {
      if (now - item.addedAt >= thresholdMs && currentCatalog[item.sku]) {
        item.price = currentCatalog[item.sku];
        this.notices.push(`Price of ${item.sku} has been updated`);
      }
    }
  }
}

module.exports = ShoppingCart;
module.exports.ShoppingCart = ShoppingCart;
module.exports.ShoppingCartEngine = ShoppingCart;