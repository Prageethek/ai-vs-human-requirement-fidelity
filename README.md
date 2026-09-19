# AI vs Human Requirement Fidelity: Empirical Evaluation of LLM Code Synthesis

An empirical software engineering research framework investigating **Requirement Fidelity**, **Boundary Value Analysis (BVA)**, and **Intent Alignment** in Large Language Model (LLM) code generation. 

This study rigorously contrasts traditional unconstrained **Natural Language Requirements (Baseline NLP)** against formal **Specification-Driven Development (SDD / BDD Gherkin)** across frontier AI models: **GPT-4**, **Claude 4.6 Opus**, and **Gemini 3.1 Pro**.

---

## 1. Research Overview & Problem Statement

While modern code generation LLMs excel at generating syntactically valid code, they exhibit high susceptibility to **Requirement Drift** and boundary violations under real-world enterprise transactional constraints:
* **Silent Failure & Assumption Hallucination:** Omitting boundary validations on zero, negative, or fractional numeric inputs.
* **Transactional State Corruption:** Mutating cart or transaction states even after rejection.
* **Side-Effect Omission:** Failing to invalidate guest sessions or preserve idempotency flags post-merge.
* **Error Payload Degradation:** Returning generic runtime exceptions rather than mathematically exact deficit calculations.

This repository provides an automated, deterministic evaluation firewall executing **25 rigorous Boundary Value Analysis (BVA) and Equivalence Partitioning (EP) assertions** per domain to empirically quantify the Failure Distribution Rate (FDR).

---

### Key Research Insight
By shifting the input paradigm from ambiguous natural language prompts to formal **Given-When-Then (Gherkin)** behavioral specifications, the average Failure Distribution Rate contracts from **32.0% down to 8.0%**, demonstrating that requirement structuring fundamentally enforces boundary adherence and intent alignment.

---

## 3. Repository Architecture

```text
ai-vs-human-requirement-fidelity/
│
├── prompts/                         # Experimental Prompting Scaffolding
│   ├── README.md                    # Methodology (CoT + Self-Criticism Engine)
│   ├── system_prompt.md             # Standardized System Instructional Tier
│   ├── method_1_baseline.md         # Method 1: Natural Language Requirements
│   └── method_2_sdd.md              # Method 2: Formal Gherkin / BDD Specifications
│
├── src/                             # Synthesized Model Source Modules
│   ├── README.md                    # Source Catalog & Domain Responsibilities
│   ├── method_1_baseline/           # Unconstrained NLP Implementations
│   │   ├── checkout/
│   │   ├── promotions/
│   │   └── shopping_cart/           # gpt4_cart.js, claude_cart.js, gemini_cart.js
│   └── method_2_sdd/                # Formal SDD Implementations
│       ├── checkout/
│       ├── promotions/
│       └── shopping_cart/           # gpt4_cart.js, claude_cart.js, gemini_cart.js
│
├── tests/                           # Deterministic Test Firewall
│   ├── suites/
│   │   └── cart_assertions.test.js  # 25 BVA/EP Behavioral Assertions
│   └── runners/
│       └── shopping_cart/           # Individual Execution Runners per Track
│           ├── test_baseline_gpt4.js
│           ├── test_baseline_claude.js
│           ├── test_baseline_gemini.js
│           ├── test_sdd_gpt4.js
│           ├── test_sdd_claude.js
│           └── test_sdd_gemini.js
│
├── package.json                     # Environment configuration & test scripts
└── README.md                        # Master Project Documentation