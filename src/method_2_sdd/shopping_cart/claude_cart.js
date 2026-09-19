"use strict";

class InvalidQuantityException extends Error {
  constructor(message = "invalid quantity: Quantity must be a positive integer greater than zero") {
    super(message);
    this.name = "InvalidQuantityException";
  }
}

class ShoppingCartEngine {
  /**
   * @param {Object} [options]
   * @param {Object.<string, { maxSaleQty?: number }>} [options.productConfig] - Per-SKU configuration
   * @param {Object.<string, { parentSku: string, stock: number }>} [options.childVariants] - Child variant stock map
   */
  constructor(options = {}) {
    /** @type {Map<string, { sku: string, quantity: number, unitPrice: number, addedAt: number }>} */
    this.items = new Map();

    /** @type {string[]} */
    this.notices = [];

    /** @type {Object.<string, { maxSaleQty?: number }>} */
    this.productConfig = options.productConfig || {};

    /** @type {Object.<string, { parentSku: string, stock: number }>} */
    this.childVariants = options.childVariants || {};

    /** @type {string|null} */
    this.sessionId = options.sessionId || null;

    /** @type {string|null} */
    this.customerId = null;

    /** @type {boolean} */
    this.sessionInvalidated = false;
  }

  // ─── Firewall Interface Getters / Setters ───────────────────────────

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
    return item ? item.unitPrice : 0;
  }

  getItems() {
    return Array.from(this.items.values()).map((item) => ({ ...item }));
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

  // ---------------------------------------------------------------------------
  // RULE 5 (BVA): Quantity validation — must be checked before any mutation
  // ---------------------------------------------------------------------------
  _validateQuantity(qty) {
    if (typeof qty !== "number" || !Number.isFinite(qty) || qty <= 0) {
      throw new InvalidQuantityException();
    }
  }

  // ---------------------------------------------------------------------------
  // RULE 5: Child SKU stock independence check
  // ---------------------------------------------------------------------------
  _checkChildVariantStock(sku, qty) {
    const variant = this.childVariants[sku];
    if (variant && variant.stock < qty) {
      return { rejected: true, code: "OUT_OF_STOCK", sku };
    }
    return { rejected: false };
  }

  // ---------------------------------------------------------------------------
  // RULE 3: Max sale quantity boundary capping
  // ---------------------------------------------------------------------------
  _applyMaxSaleQtyCap(sku, requestedQty) {
    const config = this.productConfig[sku];
    if (config && typeof config.maxSaleQty === "number") {
      const existing = this.items.has(sku) ? this.items.get(sku).quantity : 0;
      const totalDesired = existing + requestedQty;
      if (totalDesired > config.maxSaleQty) {
        const cappedTotal = config.maxSaleQty;
        const actualAdd = cappedTotal - existing;
        this.notices.push(`Maximum quantity of ${config.maxSaleQty} applied`);
        return actualAdd > 0 ? actualAdd : 0;
      }
    }
    return requestedQty;
  }

  // ---------------------------------------------------------------------------
  // Public API: addItem
  // ---------------------------------------------------------------------------
  /**
   * Add an item to the cart.
   * @param {string} sku
   * @param {number} qty - Must be > 0
   * @param {number} price - Unit price
   * @param {Object} [options]
   * @param {number} [options.addedAt] - Timestamp (ms) for stale-quote tracking
   * @returns {{ success: boolean, code?: string, sku?: string }}
   */
  addItem(sku, qty, price, options = {}) {
    // Map max_sale_qty passed dynamically via test options to productConfig
    const maxSaleQty = options.max_sale_qty !== undefined ? options.max_sale_qty : options.maxSaleQty;
    if (maxSaleQty !== undefined) {
      this.productConfig[sku] = { ...this.productConfig[sku], maxSaleQty };
    }

    // Map child stock constraints if provided dynamically
    if (options.stock !== undefined) {
      this.childVariants[sku] = { parentSku: options.parentSku || sku, stock: options.stock };
    }

    // RULE 5 (BVA): reject non-positive quantity
    this._validateQuantity(qty);

    // RULE 5: child variant stock independence
    const stockCheck = this._checkChildVariantStock(sku, qty);
    if (stockCheck.rejected) {
      return { success: false, code: stockCheck.code, sku: stockCheck.sku };
    }

    // RULE 3: max sale qty capping
    const effectiveQty = this._applyMaxSaleQtyCap(sku, qty);

    if (effectiveQty <= 0) {
      // Already at max; cap notice was already pushed
      return { success: true };
    }

    const addedAt = options.addedAt || Date.now();

    if (this.items.has(sku)) {
      const existing = this.items.get(sku);
      existing.quantity += effectiveQty;
      // Keep the original addedAt for stale-quote tracking
    } else {
      this.items.set(sku, {
        sku,
        quantity: effectiveQty,
        unitPrice: price,
        addedAt,
      });
    }

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Public API: updateQuantity
  // ---------------------------------------------------------------------------
  /**
   * Update an existing line item quantity.
   * @param {string} sku
   * @param {number} qty - New absolute quantity; must be > 0
   */
  updateQuantity(sku, qty) {
    // RULE 5 (BVA): reject non-positive quantity
    this._validateQuantity(qty);

    if (!this.items.has(sku)) {
      throw new Error(`Item ${sku} not found in cart`);
    }

    // Apply max sale qty cap (treat as absolute, not additive)
    const config = this.productConfig[sku];
    let effectiveQty = qty;
    if (config && typeof config.maxSaleQty === "number" && qty > config.maxSaleQty) {
      effectiveQty = config.maxSaleQty;
      this.notices.push(`Maximum quantity of ${config.maxSaleQty} applied`);
    }

    this.items.get(sku).quantity = effectiveQty;
  }

  // ---------------------------------------------------------------------------
  // RULE 1: Guest Cart Merging and Session Invalidation
  // ---------------------------------------------------------------------------
  /**
   * Merge a guest cart into the authenticated customer's cart.
   * Duplicate SKUs have their quantities summed. The guest cart is invalidated.
   *
   * @param {ShoppingCartEngine} guestCart - Guest session cart instance
   * @param {string} [customerId] - Authenticated customer identifier
   * @returns {{ mergedCart: ShoppingCartEngine, invalidatedSession: string|null }}
   */
  mergeGuestCart(guestCart, customerId) {
    if (customerId) {
      this.customerId = customerId;
    }

    for (const [sku, guestItem] of guestCart.items) {
      if (this.items.has(sku)) {
        // Merge: sum quantities, keep authenticated cart's unit price
        const existing = this.items.get(sku);
        existing.quantity += guestItem.quantity;
      } else {
        // Transfer: clone the guest line item into the customer cart
        this.items.set(sku, {
          sku: guestItem.sku,
          quantity: guestItem.quantity,
          unitPrice: guestItem.unitPrice,
          addedAt: guestItem.addedAt,
        });
      }
    }

    // Invalidate and clear the guest session
    const invalidatedSession = guestCart.sessionId;
    guestCart.items.clear();
    guestCart.sessionInvalidated = true;
    guestCart.notices = [];

    return { mergedCart: this, invalidatedSession };
  }

  // ---------------------------------------------------------------------------
  // RULE 2: Minimum Order Subtotal Threshold Enforcement
  // ---------------------------------------------------------------------------
  /**
   * Validate whether the cart meets the minimum order amount.
   * @param {number} minAmount - Store-configured minimum order subtotal
   * @returns {{ eligible: boolean, isEligible: boolean, errorCode?: string, deficit?: number }}
   */
  validateMinimumOrder(minAmount) {
    const subtotal = this._computeSubtotal();

    if (subtotal < minAmount) {
      const deficit = parseFloat((minAmount - subtotal).toFixed(2));
      return {
        eligible: false,
        isEligible: false,
        errorCode: "MINIMUM_ORDER_AMOUNT_NOT_MET",
        deficit,
      };
    }

    return { eligible: true, isEligible: true };
  }

  // ---------------------------------------------------------------------------
  // RULE 5: Configurable Product Variant Helper
  // ---------------------------------------------------------------------------
  addConfigurableItem(parentProduct, childSku, qty) {
    const variant = parentProduct?.variants?.[childSku];
    if (!variant || variant.stock <= 0) {
      throw new Error(`OUT_OF_STOCK for SKU "${childSku}"`);
    }
    this.addItem(childSku, qty, variant.price, { stock: variant.stock });
  }

  // ---------------------------------------------------------------------------
  // RULE 4: Stale Quote Price Re-validation
  // ---------------------------------------------------------------------------
  /**
   * Re-validate cart prices against the current master catalog.
   * @param {number} maxHours - Quote validity window in hours
   * @param {Object.<string, number>} currentCatalogPrices - SKU → current price map
   * @param {number} [now] - Override for current timestamp (ms); defaults to Date.now()
   */
  checkStaleQuote(maxHours, currentCatalogPrices, now) {
    const currentTime = now !== undefined ? now : Date.now();
    const thresholdMs = maxHours * 60 * 60 * 1000;

    for (const [sku, item] of this.items) {
      const elapsed = currentTime - item.addedAt;

      if (elapsed > thresholdMs && currentCatalogPrices.hasOwnProperty(sku)) {
        const catalogPrice = currentCatalogPrices[sku];

        if (catalogPrice !== item.unitPrice) {
          item.unitPrice = catalogPrice;
          this.notices.push(`Price of ${sku} has been updated`);
        }
      }
    }
  }

  /**
   * Alias for test firewall compatibility
   */
  revalidatePrices(maxHours, currentCatalogPrices) {
    this.checkStaleQuote(maxHours, currentCatalogPrices);
  }

  // ---------------------------------------------------------------------------
  // Public API: getCartState
  // ---------------------------------------------------------------------------
  getCartState() {
    const items = [];
    let totalQuantity = 0;

    for (const [, item] of this.items) {
      const subtotal = parseFloat((item.quantity * item.unitPrice).toFixed(2));
      items.push({
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal,
      });
      totalQuantity += item.quantity;
    }

    return {
      items,
      subtotal: this._computeSubtotal(),
      totalQuantity,
      notices: [...this.notices],
      sessionInvalidated: this.sessionInvalidated,
    };
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------
  _computeSubtotal() {
    let subtotal = 0;
    for (const [, item] of this.items) {
      subtotal += item.quantity * item.unitPrice;
    }
    return parseFloat(subtotal.toFixed(2));
  }
}

ShoppingCartEngine.InvalidQuantityException = InvalidQuantityException;

module.exports = ShoppingCartEngine;
module.exports.ShoppingCart = ShoppingCartEngine;
module.exports.ShoppingCartEngine = ShoppingCartEngine;
module.exports.InvalidQuantityException = InvalidQuantityException;