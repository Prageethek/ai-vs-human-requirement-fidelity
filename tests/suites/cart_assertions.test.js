/**
 * Deterministic SQA Testing Firewall: Phase 1 (Shopping Cart Management)
 * Evaluates generated codebases against N = 25 curated BVA & EP assertions.
 * Ground-truth business rules extracted from Odoo 17.0 and Magento 2.4.
 */

// Dynamic target loading based on TARGET_MODULE environment variable
// Dynamic target loading based on TARGET_MODULE environment variable
const targetPath = process.env.TARGET_MODULE || '../src/method_2_sdd/gpt4_cart.js';
const imported = require(targetPath);
const ShoppingCart = imported.ShoppingCart || imported.ShoppingCartEngine || imported.default || imported;

describe('Shopping Cart Deterministic Firewall - 25 BVA/EP Assertions', () => {
    let cart;

    beforeEach(() => {
        cart = new ShoppingCart();
    });


    // CATEGORY 1: Quantity Boundaries & State Mutation Prevention (BVA / EP)
    // Source: Odoo 17.0 stock.quant & RFC Input Validation Standards

    describe('Category 1: Quantity Boundaries & State Mutation Prevention', () => {

        // Assertion 01: Negative Boundary (BVA)
        test('Assert 01: Submitting quantity <= 0 (e.g. -1) must throw InvalidQuantityException', () => {
            expect(() => {
                cart.addItem('SKU-001', -1, 10.00);
            }).toThrow(/InvalidQuantityException|invalid quantity/i);
        });

        // Assertion 02: Zero Boundary (BVA)
        test('Assert 02: Submitting quantity = 0 must be rejected without mutating cart state', () => {
            try {
                cart.addItem('SKU-001', 0, 10.00);
            } catch (e) {
                // Exception is acceptable
            }
            expect(cart.getItemCount()).toBe(0);
        });

        // Assertion 03: Lower Valid Boundary (BVA)
        test('Assert 03: Submitting nominal lower boundary quantity = 1 must increment cart items', () => {
            cart.addItem('SKU-001', 1, 10.00);
            expect(cart.getItemCount()).toBe(1);
            expect(cart.getLineQuantity('SKU-001')).toBe(1);
        });

        // Assertion 04: Invalid Data Type (EP)
        test('Assert 04: Submitting non-integer string ("abc") or null must reject input', () => {
            expect(() => {
                cart.addItem('SKU-001', 'abc', 10.00);
            }).toThrow();
            expect(cart.getItemCount()).toBe(0);
        });

        // Assertion 05: Negative Quantity Update (BVA)
        test('Assert 05: Updating existing line item with negative value (-5) must fail and preserve state', () => {
            cart.addItem('SKU-001', 3, 10.00);
            expect(() => {
                cart.updateQuantity('SKU-001', -5);
            }).toThrow();
            expect(cart.getLineQuantity('SKU-001')).toBe(3);
        });

        // Assertion 06: Fractional/Float Handling (EP)
        test('Assert 06: Submitting fractional quantities (1.5) must reject or normalize strictly', () => {
            expect(() => {
                cart.addItem('SKU-001', 1.5, 10.00);
            }).toThrow(/integer|invalid/i);
        });
    });

    // =========================================================================
    // CATEGORY 2: Max Sale Quantity Capping & Notices (Rule 3)
    // Source: Magento 2.4 Quote Model (max_sale_qty enforcement)
    // =========================================================================
    describe('Category 2: Max Sale Quantity Capping & Informational Notices', () => {

        // Assertion 07: Below Upper Boundary (BVA)
        test('Assert 07: Adding 4 units when max_sale_qty = 5 must succeed without capping', () => {
            cart.addItem('SKU-E', 4, 15.00, { max_sale_qty: 5 });
            expect(cart.getLineQuantity('SKU-E')).toBe(4);
        });

        // Assertion 08: Exact Upper Boundary (BVA)
        test('Assert 08: Adding exactly 5 units when max_sale_qty = 5 must succeed without error', () => {
            cart.addItem('SKU-E', 5, 15.00, { max_sale_qty: 5 });
            expect(cart.getLineQuantity('SKU-E')).toBe(5);
        });

        // Assertion 09: Exceeding Upper Boundary (BVA)
        test('Assert 09: Adding 8 units when max_sale_qty = 5 must silently cap quantity to 5', () => {
            cart.addItem('SKU-E', 8, 15.00, { max_sale_qty: 5 });
            expect(cart.getLineQuantity('SKU-E')).toBe(5);
        });

        // Assertion 10: Non-Blocking Behavior (Silent Capping)
        test('Assert 10: Capping quantity must NOT throw an HTTP 400/422 or runtime error', () => {
            expect(() => {
                cart.addItem('SKU-E', 8, 15.00, { max_sale_qty: 5 });
            }).not.toThrow();
        });

        // Assertion 11: Session Notice Persistence
        test('Assert 11: Cart state must capture notice "Maximum quantity of 5 applied"', () => {
            cart.addItem('SKU-E', 8, 15.00, { max_sale_qty: 5 });
            const notices = cart.getNotices();
            expect(notices).toContain('Maximum quantity of 5 applied');
        });
    });


    // CATEGORY 3: Guest Cart Merging & Session Handling (Rule 1)
    // Source: Magento 2.4 Standard Checkout Logic (quote_item consolidation)

    describe('Category 3: Guest Cart Merging & Session Invalidation', () => {

        // Assertion 12: Identical SKU Quantity Summation
        test('Assert 12: Merging guest (2 units SKU-001) with customer (3 units SKU-001) must equal 5 units', () => {
            const guestCart = new ShoppingCart({ sessionId: 'GUEST-01' });
            guestCart.addItem('SKU-001', 2, 10.00);

            cart.setCustomerId('CUST-99');
            cart.addItem('SKU-001', 3, 10.00);

            cart.mergeGuestCart(guestCart);
            expect(cart.getLineQuantity('SKU-001')).toBe(5);
        });

        // Assertion 13: Disjoint SKU Ingestion
        test('Assert 13: Unique SKUs in guest cart (1 unit SKU-002) must append cleanly to customer cart', () => {
            const guestCart = new ShoppingCart({ sessionId: 'GUEST-01' });
            guestCart.addItem('SKU-001', 2, 10.00);
            guestCart.addItem('SKU-002', 1, 25.00);

            cart.setCustomerId('CUST-99');
            cart.addItem('SKU-001', 3, 10.00);

            cart.mergeGuestCart(guestCart);
            expect(cart.getLineQuantity('SKU-002')).toBe(1);
        });

        // Assertion 14: Line Item De-duplication
        test('Assert 14: Merged cart must contain exactly one consolidated line record for SKU-001', () => {
            const guestCart = new ShoppingCart({ sessionId: 'GUEST-01' });
            guestCart.addItem('SKU-001', 2, 10.00);

            cart.setCustomerId('CUST-99');
            cart.addItem('SKU-001', 3, 10.00);

            cart.mergeGuestCart(guestCart);
            const items = cart.getItems().filter(item => item.sku === 'SKU-001');
            expect(items.length).toBe(1);
        });

        // Assertion 15: Guest Session Invalidation
        test('Assert 15: Guest session must transition to invalidated upon successful merge', () => {
            const guestCart = new ShoppingCart({ sessionId: 'GUEST-01' });
            guestCart.addItem('SKU-001', 2, 10.00);

            cart.mergeGuestCart(guestCart);
            expect(guestCart.isInvalidated()).toBe(true);
        });

        // Assertion 16: Empty Guest Cart Idempotency
        test('Assert 16: Merging an empty guest cart must leave customer cart state completely unmutated', () => {
            const guestCart = new ShoppingCart({ sessionId: 'GUEST-EMPTY' });
            cart.addItem('SKU-001', 3, 10.00);

            cart.mergeGuestCart(guestCart);
            expect(cart.getItemCount()).toBe(1);
            expect(cart.getLineQuantity('SKU-001')).toBe(3);
        });
    });


    // CATEGORY 4: Minimum Order Subtotal Restriction & Deficit Calculation (Rule 2)
    // Source: Magento MinimumOrderAmount / Odoo 17.0 sale.order config

    describe('Category 4: Minimum Order Subtotal Restriction & Deficit Calculation', () => {

        // Assertion 17: Nominal Above Threshold (EP)
        test('Assert 17: Subtotal $55.00 against minimum $50.00 must allow checkout progression', () => {
            cart.addItem('SKU-001', 1, 55.00);
            const validation = cart.validateMinimumOrder(50.00);
            expect(validation.isEligible).toBe(true);
        });

        // Assertion 18: Exact Minimum Boundary (BVA)
        test('Assert 18: Subtotal exactly equal to minimum ($50.00) must allow checkout progression', () => {
            cart.addItem('SKU-001', 1, 50.00);
            const validation = cart.validateMinimumOrder(50.00);
            expect(validation.isEligible).toBe(true);
        });

        // Assertion 19: Below Threshold Rejection (BVA)
        test('Assert 19: Subtotal $45.00 against minimum $50.00 must set isEligible to false', () => {
            cart.addItem('SKU-001', 1, 45.00);
            const validation = cart.validateMinimumOrder(50.00);
            expect(validation.isEligible).toBe(false);
        });

        // Assertion 20: Explicit Error Code Surface
        test('Assert 20: Below minimum checkout must return error code MINIMUM_ORDER_AMOUNT_NOT_MET', () => {
            cart.addItem('SKU-001', 1, 45.00);
            const validation = cart.validateMinimumOrder(50.00);
            expect(validation.errorCode).toBe('MINIMUM_ORDER_AMOUNT_NOT_MET');
        });

        // Assertion 21: Deficit Metric Accuracy
        test('Assert 21: Error payload must return mathematically exact deficit amount of 5.00', () => {
            cart.addItem('SKU-001', 1, 45.00);
            const validation = cart.validateMinimumOrder(50.00);
            expect(validation.deficit).toBe(5.00);
        });
    });


    // CATEGORY 5: Child SKU Stock Independence & Price Re-validation (Rules 4 & 5)
    // Source: Magento Configurable Product Model & Quote Price Freshness

    describe('Category 5: Child SKU Stock Independence & Stale Price Re-validation', () => {

        // Assertion 22: Child Stock Isolation
        test('Assert 22: Selecting child variant with stock = 0 must reject with OUT_OF_STOCK', () => {
            const parentProduct = {
                name: 'Shirt',
                variants: {
                    'Shirt-Red-L': { stock: 0, price: 20.00 },
                    'Shirt-Blue-L': { stock: 10, price: 20.00 }
                }
            };

            expect(() => {
                cart.addConfigurableItem(parentProduct, 'Shirt-Red-L', 1);
            }).toThrow(/OUT_OF_STOCK/i);
        });

        // Assertion 23: Cart Zero-Record Protection
        test('Assert 23: Out of stock rejection must not create zero-quantity records in cart', () => {
            const parentProduct = {
                name: 'Shirt',
                variants: { 'Shirt-Red-L': { stock: 0, price: 20.00 } }
            };

            try {
                cart.addConfigurableItem(parentProduct, 'Shirt-Red-L', 1);
            } catch (e) { }

            expect(cart.getItemCount()).toBe(0);
        });

        // Assertion 24: Stale Price Synchronization
        test('Assert 24: Cart accessed after 25h must update line price from $49.99 to current $59.99', () => {
            const initialTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
            cart.addItem('SKU-H', 1, 49.99, { addedAt: initialTimestamp });

            const currentCatalog = { 'SKU-H': 59.99 };
            cart.revalidatePrices(24, currentCatalog); // 24-hour window

            expect(cart.getLinePrice('SKU-H')).toBe(59.99);
        });

        // Assertion 25: Subtotal Recalculation on Staleness
        test('Assert 25: Updating stale line price must recalculate subtotal to $59.99 and register notice', () => {
            const initialTimestamp = Date.now() - (25 * 60 * 60 * 1000);
            cart.addItem('SKU-H', 1, 49.99, { addedAt: initialTimestamp });

            const currentCatalog = { 'SKU-H': 59.99 };
            cart.revalidatePrices(24, currentCatalog);

            expect(cart.getSubtotal()).toBe(59.99);
            expect(cart.getNotices()).toContain('Price of SKU-H has been updated');
        });
    });
});