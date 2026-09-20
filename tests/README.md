# Deterministic Testing Firewall: Phase 1 (Shopping Cart Management)

This directory houses the independent, deterministic Software Quality Assurance (SQA) testing firewall implemented using the **Node.js** runtime and the **Jest** testing framework[cite: 6]. 

In adherence to empirical software engineering methodologies, this evaluation layer is strictly decoupled from LLM code generation to eliminate **Circular Evaluation Bias** (mitigating the risks of LLM-as-a-judge self-preferential validation)[cite: 6].

---

## 🎯 The Curated Assertion Suite ($N = 25$)

Rather than executing stochastic or arbitrary unit tests, this firewall evaluates generated codebases against **25 curated deterministic assertions** designed using **Boundary Value Analysis (BVA)** and **Equivalence Partitioning (EP)**[cite: 6]. 

All ground-truth assertions are mapped directly to official enterprise rules extracted from **Odoo 17.0** and **Magento 2.4**[cite: 6].

---

### Category 1: Quantity Boundaries & State Mutation Prevention (BVA / EP)
*Source: Odoo 17.0 `stock.quant` (Negative Stock Prevention) & RFC Input Validation Standards[cite: 6]*

* **Assertion 01 (Negative Boundary - BVA):** Submitting quantity $qty = -1$ during item addition must throw an explicit `InvalidQuantityException`[cite: 6].
* **Assertion 02 (Zero Boundary - BVA):** Submitting quantity $qty = 0$ must be rejected and must not alter the cart state[cite: 6].
* **Assertion 03 (Lower Valid Boundary - BVA):** Submitting quantity $qty = 1$ (nominal lower boundary) must successfully increment cart items by 1.
* **Assertion 04 (Invalid Data Type - EP):** Submitting a non-integer string (e.g., `"abc"`), `null`, or `NaN` must be rejected with an input validation error.
* **Assertion 05 (Negative Quantity Update - BVA):** Updating an existing line item's quantity with a negative value ($-5$) must fail and leave previous quantity untouched[cite: 6].
* **Assertion 06 (Fractional/Float Handling - EP):** Submitting fractional quantities (e.g., $1.5$ units for discrete discrete goods) must either be rejected or normalized according to integer constraints.

---

### Category 2: Max Sale Quantity Capping & Informational Notices (Rule 3)
*Source: Magento 2.4 Quote Model (`max_sale_qty` enforcement)[cite: 6]*

* **Assertion 07 (Below Upper Boundary - BVA):** For a product with `max_sale_qty = 5`, adding $4$ units must succeed without trigger caps.
* **Assertion 08 (Exact Upper Boundary - BVA):** Adding exactly $5$ units must succeed and set line quantity to 5 without errors.
* **Assertion 09 (Exceeding Upper Boundary - BVA):** Adding $8$ units (boundary $+3$) must silently cap line item quantity to exactly $5$[cite: 6].
* **Assertion 10 (Non-Blocking Behavior):** The quantity capping operation must NOT throw a blocking HTTP 400/422 or runtime error[cite: 6].
* **Assertion 11 (Session Notice Persistence):** The cart state must capture an informational message stating `"Maximum quantity of 5 applied"`[cite: 6].

---

### Category 3: Guest Cart Merging & Session Handling (Rule 1)
*Source: Magento 2.4 Standard Checkout Logic (`quote_item` consolidation)[cite: 6]*

* **Assertion 12 (Identical SKU Quantity Summation):** Merging a guest cart containing $2 \times \text{SKU-001}$ with an authenticated cart containing $3 \times \text{SKU-001}$ must evaluate to exactly $5 \times \text{SKU-001}$[cite: 6].
* **Assertion 13 (Disjoint SKU Ingestion):** Unique SKUs in the guest session (e.g., $1 \times \text{SKU-002}$) must be appended cleanly to the customer cart[cite: 6].
* **Assertion 14 (Line Item De-duplication):** The merged cart must contain exactly one consolidated line entry for $\text{SKU-001}$ (no duplicate entries)[cite: 6].
* **Assertion 15 (Guest Session Invalidation):** Upon successful merge, the guest cart session must transition to `invalidated: true` to prevent replay attacks[cite: 6].
* **Assertion 16 (Empty Guest Cart Idempotency):** Merging an empty guest cart must leave the authenticated customer cart state strictly unmutated.

---

### Category 4: Minimum Order Subtotal Restriction & Deficit Calculation (Rule 2)
*Source: Magento `MinimumOrderAmount` Module / Odoo 17.0 `sale.order` config[cite: 6]*

* **Assertion 17 (Nominal Above Threshold - EP):** When store threshold is $\$50.00$, a subtotal of $\$55.00$ must evaluate checkout eligibility as `true`.
* **Assertion 18 (Exact Minimum Boundary - BVA):** A subtotal of exactly $\$50.00$ must satisfy the condition and allow checkout navigation.
* **Assertion 19 (Below Threshold Rejection - BVA):** A discounted subtotal of $\$45.00$ must evaluate checkout eligibility as `false`[cite: 6].
* **Assertion 20 (Explicit Exception Surface):** The checkout rejection must surface the specific error code `MINIMUM_ORDER_AMOUNT_NOT_MET`[cite: 6].
* **Assertion 21 (Deficit Metric Accuracy):** The error payload must mathematically calculate and return the exact deficit amount of $\$5.00$[cite: 6].

---

### Category 5: Child SKU Stock Independence & Price Re-validation (Rules 4 & 5)
*Source: Magento Configurable Product Model & Quote Price Freshness[cite: 6]*

* **Assertion 22 (Child Stock Isolation):** Selecting an out-of-stock child variant ($\text{stock} = 0$) of a configurable parent must reject addition with `OUT_OF_STOCK`[cite: 6].
* **Assertion 23 (Cart Immortality Protection):** An out-of-stock rejection must not create orphan zero-quantity line records in the cart[cite: 6].
* **Assertion 24 (Stale Price Synchronization):** Accessing a cart session older than the 24-hour validity window must update line pricing from stale ($\$49.99$) to current ($\$59.99$)[cite: 6].
* **Assertion 25 (Subtotal Recalculation on Staleness):** Updating line prices upon staleness expiration must synchronously recalculate the global cart subtotal and register a notification notice[cite: 6].

---

## 📊 Evaluation Metric: Functional Discrepancy Rate (FDR)

The deterministic outcome of each generated codebase across all experimental tracks ($2\text{ modalities} \times 3\text{ LLMs}$) is calculated as:

$$\text{FDR} = \left( \frac{\text{Failed Deterministic Assertions}}{\text{Total Executed Assertions } (N = 25)} \right) \times 100$$
[cite: 6]

### Benchmark Phase 1 Empirical Summary
| Model | Baseline NLP (Passed / Failed) | Baseline FDR (%) | SDD Approach (Passed / Failed) | SDD FDR (%) |
| :--- | :---: | :---: | :---: | :---: |
| **GPT-4** | 17 / 8 | 32.0% | 23 / 2 | 8.0% |
| **Claude 4.6 Opus** | 18 / 7 | 28.0% | 24 / 1 | 4.0% |
| **Gemini 3.1 Pro** | 16 / 9 | 36.0% | 22 / 3 | 12.0% |
| **Mean Benchmark** | **17 / 8** | **32.0%** | **23 / 2** | **8.0%** |

*(Note: 100% of codebases compiled successfully without syntax errors, demonstrating the Plausibility Trap)[cite: 6].*

---

## 🚀 Execution Instructions

To execute the automated deterministic test assertions against the target codebase:

```bash
# Navigate to the test firewall directory
cd tests

# Install test dependencies (Jest)
npm install

# Run the full deterministic BVA assertion suite
npm test