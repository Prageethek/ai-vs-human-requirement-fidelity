Implement a robust, production-grade Shopping Cart Management module in Node.js adhering strictly to Specification-Driven Development (SDD). 

Your implementation must fully implement and pass the following formal Behavior-Driven Development (BDD) Gherkin specifications extracted from enterprise ground-truth architectures (Odoo 17.0 and Magento 2.4).

Feature: E-Commerce Shopping Cart Management Engine
  As an e-commerce backend service
  I want to process shopping cart operations deterministically
  So that enterprise business invariants, boundary constraints, and state transitions are strictly preserved.

  # -------------------------------------------------------------------------
  # RULE 1: Guest Cart Merging and Session Invalidation (Magento quote_item)
  # -------------------------------------------------------------------------
  Scenario: Authenticated customer cart merges line items with guest session
    Given an active guest cart session "GUEST-01" containing:
      | sku     | quantity | unit_price |
      | SKU-001 | 2        | 10.00      |
      | SKU-002 | 1        | 25.00      |
    And an authenticated customer "CUST-99" with a saved cart containing:
      | sku     | quantity | unit_price |
      | SKU-001 | 3        | 10.00      |
    When the guest user authenticates as customer "CUST-99" and triggers cart merge
    Then the resulting merged cart for "CUST-99" must contain:
      | sku     | quantity | subtotal |
      | SKU-001 | 5        | 50.00    |
      | SKU-002 | 1        | 25.00    |
    And no duplicate line items for "SKU-001" must exist in the cart
    And the guest session "GUEST-01" must be marked as invalidated and cleared

  # -------------------------------------------------------------------------
  # RULE 2: Minimum Order Subtotal Threshold Enforcement (Odoo / Magento)
  # -------------------------------------------------------------------------
  Scenario: Checkout is blocked when subtotal falls below minimum threshold
    Given the store configured minimum order amount is $50.00
    And the cart contains items with subtotal $45.00 after applying active discounts
    When the customer initiates the checkout navigation transition
    Then the checkout progression must be blocked with error code "MINIMUM_ORDER_AMOUNT_NOT_MET"
    And the error payload must explicitly include the deficit amount of $5.00
    And the cart checkout eligibility status must be false

  # -------------------------------------------------------------------------
  # RULE 3: Max Sale Quantity Boundary Capping & Session Notice (Magento Quote)
  # -------------------------------------------------------------------------
  Scenario: Excess quantity is silently capped to max_sale_qty with session notice
    Given product "SKU-E" is configured with "max_sale_qty" of 5
    And the cart currently contains 0 units of "SKU-E"
    When the customer attempts to add 8 units of "SKU-E" to the cart
    Then the cart line item quantity for "SKU-E" must be capped exactly to 5
    And the system must not throw an HTTP 400 or 422 error
    And the cart state must register an informational notice: "Maximum quantity of 5 applied"

  # -------------------------------------------------------------------------
  # RULE 4: Stale Quote Price Re-validation (Magento Quote Model)
  # -------------------------------------------------------------------------
  Scenario: Stale cart triggers synchronous price re-validation and notice
    Given product "SKU-H" was added to cart at price $49.99 at timestamp T0
    And the store quote validity threshold window is configured to 24 hours
    And the master catalog price of "SKU-H" was updated to $59.99 at timestamp T0 + 12 hours
    When the customer accesses the cart at timestamp T0 + 25 hours
    Then the line item price for "SKU-H" must update to $59.99
    And the cart subtotal must be recomputed using the new price $59.99
    And a notification message must be attached to the cart: "Price of SKU-H has been updated"

  # -------------------------------------------------------------------------
  # RULE 5: Child SKU Stock Independence & Boundary Value Rejection
  # -------------------------------------------------------------------------
  Scenario: Out-of-stock child SKU rejects addition despite parent variant availability
    Given configurable product "Shirt" has child variant "Shirt-Red-L" with stock quantity 0
    And child variant "Shirt-Blue-L" has available stock quantity 10
    When the customer selects configuration "Red / Large" and attempts to add 1 unit to cart
    Then the operation must be rejected with status code "OUT_OF_STOCK" for SKU "Shirt-Red-L"
    And the cart item count must remain 0

  Scenario: Negative and zero quantity inputs are strictly rejected (BVA Assertion)
    Given an active cart with existing line items
    When the customer attempts to add or update any line item with quantity <= 0 (e.g., -1 or 0)
    Then the system must throw an "InvalidQuantityException"
    And the cart items and total quantity must remain unmutated

--- IMPLEMENTATION CONSTRAINTS ---
1. Implement this as a clean, exportable Node.js module (e.g., `class ShoppingCartEngine`).
2. Implement explicit domain methods: `addItem(sku, qty, price, options)`, `updateQuantity(sku, qty)`, `mergeGuestCart(guestCart, customerId)`, `validateMinimumOrder(minAmount)`, `checkStaleQuote(maxHours, currentCatalogPrices)`, and `getCartState()`.
3. Adhere strictly to the Given-When-Then outcomes specified above.