# Translation Generation Executive Summary (BLOCK 43)

**Generated At:** 2026-09-12T08:57:59.760Z
**Translation Engine Provider:** Deterministic Domain & Terminology Engine (BLOCK 43)
**Canonical Source Language:** Arabic (`ar`) — 100% Preserved Invariance
**Target Proposal Languages:** English (`en`), Urdu (`ur`)

## 1. Key Metrics & Overall Yield

| Metric | Count | Percentage | Architectural Role |
| :--- | :--- | :--- | :--- |
| **Total Entries Processed** | **9410** | 100.0% | Complete catalog coverage |
| **Generated English Proposals** | **9410** | 100.0% | English target translation proposals |
| **Generated Urdu Proposals** | **9410** | 100.0% | Urdu target translation proposals |
| **Review-Required Proposals** | **9405** | 99.9% | Flagged for human translator sign-off |
| **High-Risk Entries** | **9405** | 99.9% | Formulas, conflicts, or complex templates |
| **Interpolation Entries** | **192** | 2.0% | Dynamic parameters strictly preserved |
| **Pluralization Requirements** | **149** | 1.6% | Aligned with Arabic 6-form rules |
| **Protected Business Tokens** | **1** | 0.0% | IDs, codes, units (SAR, KG, TON) |
| **Semantic Conflicts Isolated** | **834** | 8.9% | Distinct contextual keys maintained |
| **Domain Terminology Entries** | **0** | 0.0% | Heavy transport & enterprise terms |

## 2. Confidence Level Distribution

| Confidence Level | Count | Percentage | Criteria |
| :--- | :--- | :--- | :--- |
| **HIGH** | **137** | 1.5% | Foundation verified & exact UI dictionary matches |
| **MEDIUM** | **2768** | 29.4% | Contextual UI terms with clear semantics |
| **LOW** | **6505** | 69.1% | Ambiguous phrases, high risk, or conflicts (Review Mandatory) |

## 3. Tiered Strategy Breakdown

| Strategy Tier | Count | Description |
| :--- | :--- | :--- |
| **Tier 1: Safe Generic UI** | **5** | Common buttons, actions, and standard alerts |
| **Tier 2: Contextual Application UI** | **0** | Logistics entities (Trucks, Drivers, Carriers, Projects) |
| **Tier 3: Domain-Sensitive** | **0** | Pricing, Settlement, Weighbridge, Security, Exceptions |
| **Tier 4: High Risk** | **9405** | Semantic conflicts, complex templates, mixed calculations |

## 4. Category Breakdown

| Category | Total Entries | Generated | Review Required | High Conf | Med Conf | Low Conf |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `other` | 2202 | 2202 | 2200 | 79 | 469 | 1654 |
| `imports` | 1575 | 1575 | 1575 | 17 | 389 | 1169 |
| `trips` | 683 | 683 | 683 | 7 | 305 | 371 |
| `reports` | 567 | 567 | 567 | 3 | 166 | 398 |
| `weighbridge` | 521 | 521 | 521 | 4 | 140 | 377 |
| `security` | 503 | 503 | 502 | 3 | 198 | 302 |
| `pricing` | 491 | 491 | 491 | 1 | 171 | 319 |
| `offline` | 392 | 392 | 392 | 1 | 168 | 223 |
| `legacyMigration` | 352 | 352 | 352 | 2 | 55 | 295 |
| `entityResolution` | 342 | 342 | 342 | 1 | 76 | 265 |
| `navigation` | 339 | 339 | 339 | 2 | 86 | 251 |
| `exceptions` | 337 | 337 | 337 | 0 | 86 | 251 |
| `loading` | 239 | 239 | 239 | 4 | 115 | 120 |
| `projects` | 221 | 221 | 221 | 3 | 85 | 133 |
| `dashboard` | 220 | 220 | 220 | 5 | 79 | 136 |
| `unloading` | 199 | 199 | 199 | 2 | 87 | 110 |
| `materials` | 67 | 67 | 67 | 0 | 33 | 34 |
| `carriers` | 63 | 63 | 61 | 3 | 27 | 33 |
| `validation` | 33 | 33 | 33 | 0 | 4 | 29 |
| `trucks` | 28 | 28 | 28 | 0 | 15 | 13 |
| `drivers` | 22 | 22 | 22 | 0 | 11 | 11 |
| `authentication` | 14 | 14 | 14 | 0 | 3 | 11 |

## 5. Review Reasons Breakdown

| Review Reason | Items Flagged | Primary Trigger |
| :--- | :--- | :--- |
| `SEMANTIC_CONFLICT` | **834** | Triggered by rule engine classification |
| `INTERPOLATION_RISK` | **8** | Triggered by rule engine classification |
| `PLURALIZATION_RISK` | **149** | Triggered by rule engine classification |
| `REPORT_EXPORT_RISK` | **1625** | Triggered by rule engine classification |
| `BUSINESS_DATA_RISK` | **1427** | Triggered by rule engine classification |
| `LOW_CONFIDENCE` | **9405** | Triggered by rule engine classification |

## 6. Architectural Invariance Guarantees

- **No Application Files Modified:** 0 application TSX/TS/JSX components touched.
- **No Codemod Executed:** Components continue serving literal strings in production.
- **Foundation Dictionary Untouched:** Verified BLOCK 40 foundation dictionary remains 100% identical.
- **Interpolation Parameter Preservation:** 100% of dynamic parameters verified across all generated proposals.
- **Business Data Intact:** Calculations, Firestore, pricing, reports, and weight state machines remain untouched.
