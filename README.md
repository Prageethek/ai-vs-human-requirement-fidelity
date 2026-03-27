# Requirements Fidelity in the Age of Generative AI
**SENG 43216: Software Engineering Research Project** *University of Kelaniya - Faculty of Science* 

---

## 📌 Project Overview
This research conducts a controlled empirical comparison between **AI-generated** and **Human-developed** software systems. The primary focus is to measure **Requirement Fidelity**—the extent to which the final software product satisfies customer-defined functional and non-functional requirements.

We utilize a medium-complexity **E-commerce Platform** as a case study to evaluate three development conditions:
1. **Condition A:** Fully AI-Generated (Complete software developed using frontier LLM tools with structured prompt engineering).
2. **Condition B:** Human-Led Traditional (Developed by an experienced team following Agile methodology).
3. **Condition C:** Hybrid AI-Assisted (Human developers utilizing AI tools as assistants—industry standard).

## 🎯 Research Objectives
* **RO1:** To systematically measure and compare the degree to which AI and Human projects satisfy explicit customer acceptance criteria.
* **RO2:** To identify and categorize the types and severity of requirement-related defects (omissions vs. misinterpretations).
* **RO3:** To evaluate the satisfaction of Non-Functional Requirements (NFRs) such as performance, security, and usability.
* **RO4:** To develop an evidence-based decision-support framework for industry practitioners.

## 📊 Key Metric: RTC
The primary dependent variable is the **Requirement Traceability Coverage (RTC)**:

$$RTC = \left( \frac{\text{Number of Acceptance Criteria Passed}}{\text{Total Number of Acceptance Criteria Defined}} \right) \times 100\%$$

---

## 📂 Repository Structure
This repository follows the mandatory structure defined in the **SENG 43216 Project Guidelines** :

```text
project-name/
├── README.md           # Project overview and navigation
├── docs/               # Project documentation
│   ├── proposal/       # Milestone 1: Research Proposal [cite: 179]
│   ├── interim-report/ # Milestone 3: Intermediate Report [cite: 238]
│   ├── final-thesis/   # Milestone 4: Final Thesis [cite: 277]
│   └── presentations/  # All milestone presentation slides
├── src/                # Source code organized by component (AI, Human, Hybrid) [cite: 441]
├── data/               # Datasets, user study results, and metrics [cite: 443]
├── tests/              # Gherkin test cases and automated scripts [cite: 445]
├── results/            # Experimental results and RTC data [cite: 447]
└── LICENSE             # Project license information

```
## 📅 Milestones & Timeline
* Milestone 1: Proposal Submission & Presentation (Week 4).
* Milestone 2: Monthly Progress Reports (Last Friday of each month).
* Milestone 3: Intermediate Report & Presentation (Week 14-15).
* Milestone 4: Final Thesis & Presentation (Week 30).
* Milestone 5: Final Individual Evaluation Report (Final + 1 Week).

## 🛠 Documentation & Standards
* Version Control: Mandatory use of Git with regular, meaningful commits.
* Attribution: AI tool usage is disclosed and verified in compliance with the Ethical AI Tool Usage policy.
* Testing: Projects demonstrate unit testing and validation studies for quality assurance.

## 👥 Team Organization
* SE/2021/028
* SE/2021/049
* SE/2021/039
* SE/2021/058
