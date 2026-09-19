# Experimental Prompts Architecture & LLM Calibration

This directory contains the operational prompt artifacts employed in the empirical evaluation of AI code generation fidelity across two methodological tracks: **Baseline NLP** (Method 1) and **Specification-Driven Development (SDD)** (Method 2).

---

## 1. System Prompt Architecture: CoT + Self-Criticism Engine

All model evaluations (GPT-4, Claude 3.5 Sonnet / 4.6 Opus, Gemini 3.1 Pro) were anchored on a standardized multi-stage cognitive scaffold integrating **Chain-of-Thought (CoT)** reasoning and an automated **Self-Criticism / Verification** cycle prior to code synthesis.

### Cognitive Pipeline
1. **Context Grounding:** Deconstructs user intent, domain boundaries, and state mutations within enterprise e-commerce transactional constraints.
2. **Chain-of-Thought (CoT) Pre-execution:** Forces the model to explicitly reason step-by-step through boundary conditions (BVA), equivalence partitions (EP), and edge scenarios before emitting code.
3. **Self-Criticism & Fault Reflection:** Evaluates intermediate reasoning against regression traps:
   - *State mutation prevention on rejected transactions.*
   - *Silent capping vs. hard runtime error throwing.*
   - *Session persistence and invalidation side effects.*
   - *Deficit calculations and precision retention.*
4. **Code Synthesis:** Generates deterministic, production-grade ECMAScript modules strictly conforming to the interface contract.

---

## 2. Experimental Prompt Taxonomy

### Method 1: Baseline NLP Prompt (`baseline_nlp_prompt.md`)
* **Paradigm:** Natural Language Requirements Specification.
* **Characteristics:** High-level user stories, functional outlines, and business objectives written in standard software specification English.
* **Objective:** Measures default LLM interpretation variance, assumption generation, and requirement drift when boundary rules (such as negative inputs, non-integer formats, and quote expiry windows) are not formally constrained.
* **Observed Flaws:** Induces higher Failure Distribution Rates (FDR 28%–36%) due to omitted boundary guards, unhandled session flags, and payload structural mismatches.

### Method 2: Specification-Driven Development (SDD) Prompt (`sdd_gherkin_prompt.md`)
* **Paradigm:** Formal Gherkin / BDD (Given-When-Then) Contract Specifications.
* **Characteristics:** Deterministic behavioral definitions outlining explicit preconditions, transactional execution triggers, boundary threshold values, and expected domain events/exceptions.
* **Objective:** Assesses whether structural specification boundaries eliminate requirement ambiguity and enforce behavioral alignment across LLM synthesis.
* **Observed Efficacy:** Significantly contracts the defect surface across all frontier models, achieving an average FDR of 8.0% (down to 4.0% in frontier reasoning models).

---

## 3. Directory Layout

```text
prompts/
├── README.md                  # Prompting methodology and architectural documentation
├── system_prompt.md           # Unified System Prompt (CoT + Self-Criticism)
├── method_1_baseline.md       # Method 1: Natural Language Requirements Specification
└── method_2_sdd.md            # Method 2: Gherkin Given-When-Then Specification Suite