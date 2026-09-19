Develop a complete, production-grade Shopping Cart Management module in Node.js for an e-commerce platform.

The module should implement a shopping cart class or service that manages items, quantities, and totals with the following business requirements:

1. Basic Cart Operations:
   - Allow adding products with an item identifier (SKU), quantity, and unit price.
   - Allow updating product quantities and removing items from the cart.
   - Accurately compute the cart subtotal based on line items and quantities.

2. Inventory and Quantity Controls:
   - Prevent invalid quantities from being added to the cart.
   - Handle product availability and stock limits properly. If a product has a configured maximum allowed sale quantity, handle situations where a user requests more than the maximum.
   - Ensure the cart state remains consistent during modifications.

3. Guest Cart Merging:
   - Support merging a guest cart into a registered customer's cart when the customer logs in.
   - Consolidate line items so that shared products update their quantities properly without duplicating line items, and clear the temporary guest session.

4. Minimum Order Checkout Validation:
   - Provide a method to validate whether the cart satisfies the store's minimum order requirement before proceeding to checkout, returning appropriate status if the subtotal is insufficient.

Export the module so that it can be easily integrated and tested in an external testing environment.