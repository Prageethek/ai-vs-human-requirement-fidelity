"use strict";

class InvalidQuantityException extends Error {
  constructor(message = "invalid quantity: Quantity must be a positive integer.") {
    super(message);
    this.name = "InvalidQuantityException";
  }
}

class ShoppingCart {
  /**
   * @param {object} [options]
   * @param {number} [options.minimumOrderAmount=0] - Minimum subtotal required for checkout.
   */
  constructor(options = {}) {
    this.items = new Map();
    this.minimumOrderAmount = options.minimumOrderAmount || 0;
    this.customerId = null;
    this.notices = [];
    this.sessionInvalidated = false;
  }

  // ─── Firewall Interface Getters / Setters ───────────────────────────

  setCustomerId(id) {
    this.customerId = id;
  }

  getLineQuantity(sku) {
    const item = this.items.get(sku);
    return item ? item.quantity : 0;
  }

  getLinePrice(sku) {
    const item = this.items.get(sku);
    return item ? item.unitPrice : 0;
  }

  getNotices() {
    return [...this.notices];
  }

  isInvalidated() {
    return this.sessionInvalidated;
  }

  /**
   * Add a product to the cart.
   */
  addItem(sku, quantity, unitPrice, options = {}) {
    const mappedOptions = {
      ...options,
      maxQuantity: options.maxQuantity !== undefined ? options.maxQuantity : options.max_sale_qty,
      stockLimit: options.stockLimit !== undefined ? options.stockLimit : options.stock,
    };

    this._validateSku(sku);
    this._validateQuantity(quantity);
    this._validatePrice(unitPrice);

    const existing = this.items.get(sku);
    const currentQuantity = existing ? existing.quantity : 0;
    let newQuantity = currentQuantity + quantity;

    // Baseline Flaw: Throws error instead of silent capping when maxQuantity is exceeded
    // Fails Assert 09, 10, 11
    if (mappedOptions.maxQuantity !== undefined && newQuantity > mappedOptions.maxQuantity) {
      throw new Error(`Quantity exceeds max allowable sale limit of ${mappedOptions.maxQuantity}`);
    }

    if (mappedOptions.stockLimit !== undefined && newQuantity > mappedOptions.stockLimit) {
      newQuantity = mappedOptions.stockLimit;
    }

    if (newQuantity <= 0) {
      throw new Error(`Cannot add item "${sku}": resulting quantity is zero or negative.`);
    }

    const item = {
      sku,
      quantity: newQuantity,
      unitPrice,
      addedAt: options.addedAt || Date.now(),
      ...(mappedOptions.maxQuantity !== undefined && { maxQuantity: mappedOptions.maxQuantity }),
      ...(mappedOptions.stockLimit !== undefined && { stockLimit: mappedOptions.stockLimit }),
    };

    this.items.set(sku, item);
    return { sku: item.sku, quantity: item.quantity, unitPrice: item.unitPrice };
  }

  /**
   * Update the quantity of an existing item in the cart.
   * Baseline Flaw: Deletes item on quantity <= 0 without throwing, mutating state incorrectly
   * Fails Assert 05
   */
  updateItemQuantity(sku, quantity) {
    this._validateSku(sku);

    const existing = this.items.get(sku);
    if (!existing) {
      throw new Error(`Item "${sku}" not found in cart.`);
    }

    if (quantity <= 0) {
      this.items.delete(sku);
      return { sku, quantity: 0, unitPrice: existing.unitPrice };
    }

    this._validateQuantity(quantity);

    let finalQuantity = quantity;
    if (existing.maxQuantity !== undefined && finalQuantity > existing.maxQuantity) {
      finalQuantity = existing.maxQuantity;
    }
    if (existing.stockLimit !== undefined && finalQuantity > existing.stockLimit) {
      finalQuantity = existing.stockLimit;
    }

    existing.quantity = finalQuantity;
    return { sku: existing.sku, quantity: existing.quantity, unitPrice: existing.unitPrice };
  }

  updateQuantity(sku, quantity) {
    return this.updateItemQuantity(sku, quantity);
  }

  removeItem(sku) {
    this._validateSku(sku);
    if (!this.items.has(sku)) {
      throw new Error(`Item "${sku}" not found in cart.`);
    }
    return this.items.delete(sku);
  }

  getItem(sku) {
    const item = this.items.get(sku);
    if (!item) return undefined;
    return { sku: item.sku, quantity: item.quantity, unitPrice: item.unitPrice };
  }

  getItems() {
    return Array.from(this.items.values()).map((item) => ({
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));
  }

  getSubtotal() {
    let subtotal = 0;
    for (const item of this.items.values()) {
      subtotal += item.quantity * item.unitPrice;
    }
    return Math.round(subtotal * 100) / 100;
  }

  getItemCount() {
    return this.items.size;
  }

  /**
   * Baseline Flaw: Merges items cleanly but omits setting guest session invalidation flag
   * Fails Assert 15
   */
  mergeCart(guestCart) {
    if (!guestCart || typeof guestCart.getItems !== "function") {
      throw new Error("guestCart must be an instance of ShoppingCart.");
    }

    for (const guestItem of guestCart.items.values()) {
      const existing = this.items.get(guestItem.sku);

      if (existing) {
        let mergedQuantity = existing.quantity + guestItem.quantity;
        const maxQ = existing.maxQuantity || guestItem.maxQuantity;
        if (maxQ && mergedQuantity > maxQ) mergedQuantity = maxQ;
        existing.quantity = mergedQuantity;
      } else {
        this.items.set(guestItem.sku, { ...guestItem });
      }
    }

    guestCart.clear();
  }

  mergeGuestCart(guestCart) {
    return this.mergeCart(guestCart);
  }

  /**
   * Baseline Flaw: Returns boolean eligibility only, omitting errorCode and deficit
   * Passes Assert 17, 18, 19
   * Fails Assert 20 (errorCode undefined) & Assert 21 (deficit undefined)
   */
  validateCheckout(minimumAmount) {
    const threshold =
      minimumAmount !== undefined ? minimumAmount : this.minimumOrderAmount;

    if (typeof threshold !== "number" || threshold < 0) {
      throw new Error("Minimum order amount must be a non-negative number.");
    }

    const subtotal = this.getSubtotal();
    const eligible = subtotal >= threshold;

    return {
      eligible,
      isEligible: eligible,
      subtotal,
      minimumOrderAmount: threshold
    };
  }

  validateMinimumOrder(minimumAmount) {
    return this.validateCheckout(minimumAmount);
  }

  addConfigurableItem(parentProduct, childSku, qty) {
    const variant = parentProduct?.variants?.[childSku];
    if (!variant || variant.stock <= 0) {
      throw new Error(`OUT_OF_STOCK for SKU "${childSku}"`);
    }
    this.addItem(childSku, qty, variant.price, { stockLimit: variant.stock });
  }

  revalidatePrices(maxHours, currentCatalog = {}) {
    const thresholdMs = maxHours * 60 * 60 * 1000;
    const now = Date.now();

    for (const item of this.items.values()) {
      if (item.addedAt && now - item.addedAt >= thresholdMs && currentCatalog[item.sku] !== undefined) {
        item.unitPrice = currentCatalog[item.sku];
        this.notices.push(`Price of ${item.sku} has been updated`);
      }
    }
  }

  clear() {
    this.items.clear();
  }

  // ─── Private helpers ────────────────────────────────────────────────

  _validateSku(sku) {
    if (typeof sku !== "string" || sku.trim().length === 0) {
      throw new Error("SKU must be a non-empty string.");
    }
  }

  _validateQuantity(quantity) {
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity <= 0) {
      throw new InvalidQuantityException("invalid quantity: Quantity must be a positive integer.");
    }
  }

  _validatePrice(price) {
    if (typeof price !== "number" || price < 0 || !Number.isFinite(price)) {
      throw new Error("Unit price must be a non-negative finite number.");
    }
  }
}

ShoppingCart.InvalidQuantityException = InvalidQuantityException;

module.exports = ShoppingCart;
module.exports.ShoppingCart = ShoppingCart;
module.exports.ShoppingCartEngine = ShoppingCart;
module.exports.InvalidQuantityException = InvalidQuantityException;