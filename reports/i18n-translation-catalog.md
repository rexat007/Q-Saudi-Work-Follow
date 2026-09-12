# Production Translation Catalog & Semantic Review Report (BLOCK 42)

**Generated At:** 2026-09-12T10:18:40.004Z
**Catalog Version:** 1.0.0-block42
**Canonical Source Language:** Arabic (`ar`) — 100% Preserved Invariance
**Target Languages:** English (`en`), Urdu (`ur`)

## 1. Executive Catalog Metrics

| Metric | Count | Description |
| :--- | :--- | :--- |
| **Total Unique Catalog Keys** | **9429** | Distinct semantic translation keys generated |
| **Translated Keys (Phase 1 Foundation)** | **5** | Approved canonical terms (ar, en, ur verified) |
| **Untranslated Slots (Pending Review)** | **6446** | Explicitly flagged for professional human review |
| **Review Required Keys** | **6446** | Domain terminology requiring semantic verification |
| **Ambiguous Keys Isolated** | **2977** | Short tokens or codes quarantined from auto-translation |
| **Protected Business Tokens** | **1** | Database identifiers, formulas, units, currencies |
| **Interpolation Placeholders** | **192** | Dynamic parameters (e.g. `{count}`) strictly preserved |
| **Pluralization Requirements** | **149** | Expressions requiring 6 Arabic plural forms |
| **Semantic Conflicts Isolated** | **305** | Identical texts split into separate contextual keys |
| **Duplicate Groups (Type A Sharing)** | **1426** | Safe identical-context key reuse candidates |
| **Directional Migration Queue** | **229** | Physical Tailwind classes flagged for RTL/LTR migration |

## 2. Category Distribution & Translation Readiness

| Category | Total Keys | Translated | Untranslated | Review Required | Ambiguous |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `other` | 2267 | 2 | 1379 | 1379 | 886 |
| `imports` | 1575 | 0 | 1087 | 1087 | 488 |
| `trips` | 683 | 0 | 563 | 563 | 120 |
| `reports` | 567 | 0 | 375 | 375 | 191 |
| `weighbridge` | 521 | 0 | 332 | 332 | 189 |
| `security` | 503 | 1 | 397 | 397 | 105 |
| `pricing` | 491 | 0 | 321 | 321 | 170 |
| `offline` | 392 | 0 | 300 | 300 | 92 |
| `legacyMigration` | 352 | 0 | 181 | 181 | 171 |
| `entityResolution` | 342 | 0 | 263 | 263 | 79 |
| `exceptions` | 337 | 0 | 220 | 220 | 117 |
| `navigation` | 293 | 0 | 190 | 190 | 103 |
| `loading` | 239 | 0 | 206 | 206 | 33 |
| `projects` | 221 | 0 | 154 | 154 | 67 |
| `dashboard` | 220 | 0 | 160 | 160 | 60 |
| `unloading` | 199 | 0 | 169 | 169 | 30 |
| `materials` | 67 | 0 | 49 | 49 | 18 |
| `carriers` | 63 | 2 | 49 | 49 | 12 |
| `validation` | 33 | 0 | 16 | 16 | 17 |
| `trucks` | 28 | 0 | 15 | 15 | 13 |
| `drivers` | 22 | 0 | 11 | 11 | 11 |
| `authentication` | 14 | 0 | 9 | 9 | 5 |

## 3. Semantic Conflict Separation (Sample)

Identical Arabic terms separated into distinct keys based on operational context to prevent catastrophic UI or business conflation:

| Key | Arabic Source | Category | Semantic Context | Review Status |
| :--- | :--- | :--- | :--- | :--- |
| `carriers.actions.cancel` | "إلغاء" | `carriers` | jsx_text | `REVIEW_REQUIRED` |
| `carriers.labels.add` | "إضافة ناقل جديد" | `carriers` | jsx_text | `REVIEW_REQUIRED` |
| `carriers.labels.carrier_4` | "الناقل غير موجود" | `carriers` | literal | `REVIEW_REQUIRED` |
| `carriers.labels.save` | "حفظ التعديلات" | `carriers` | literal | `REVIEW_REQUIRED` |
| `carriers.labels.status` | "الحالة التشغيلية (status)" | `carriers` | jsx_text | `REVIEW_REQUIRED` |
| `carriers.labels.txt_1f05e4` | "البريد الإلكتروني" | `carriers` | jsx_text | `REVIEW_REQUIRED` |
| `carriers.labels.txt_252d6d` | "الجوال:" | `carriers` | jsx_text | `REVIEW_REQUIRED` |
| `carriers.labels.txt_2f889d` | "السجل التجاري:" | `carriers` | jsx_text | `REVIEW_REQUIRED` |
| `carriers.labels.txt_2f9f86` | "مسؤول العمليات" | `carriers` | literal | `REVIEW_REQUIRED` |
| `carriers.labels.txt_38b1a6` | "معطّل (DISABLED)" | `carriers` | jsx_text | `REVIEW_REQUIRED` |
| `carriers.labels.txt_5b459d` | "معطّل" | `carriers` | jsx_text | `REVIEW_REQUIRED` |
| `carriers.labels.txt_7f2994` | "المسؤول:" | `carriers` | jsx_text | `REVIEW_REQUIRED` |
| `carriers.status.active` | "نشط (ACTIVE)" | `carriers` | jsx_text | `REVIEW_REQUIRED` |
| `carriers.status.active_2` | "نشط" | `carriers` | jsx_text | `REVIEW_REQUIRED` |
| `dashboard.fields.trip` | "رقم الرحلة / التذكرة" | `dashboard` | jsx_text | `REVIEW_REQUIRED` |

## 4. Directional Migration Queue (First 15 Items)

| File | Line | Physical Class | Recommended Logical Class | Risk |
| :--- | :--- | :--- | :--- | :--- |
| `src/App.tsx` | 442 | `mr-0.5` | `me-0.5` | `MUST_MIGRATE` |
| `src/App.tsx` | 703 | `ChevronLeft` | `Logical directional flip required (e.g. rtl:rotate-180)` | `MUST_MIGRATE` |
| `src/App.tsx` | 726 | `ChevronLeft` | `Logical directional flip required (e.g. rtl:rotate-180)` | `MUST_MIGRATE` |
| `src/components/FirestoreArchitectureView.tsx` | 470 | `text-left` | `text-start` | `MUST_MIGRATE` |
| `src/components/FirestoreArchitectureView.tsx` | 528 | `pr-1` | `pe-1` | `MUST_MIGRATE` |
| `src/components/TripEngineView.tsx` | 609 | `mr-1` | `me-1` | `MUST_MIGRATE` |
| `src/components/TripEngineView.tsx` | 630 | `mr-1` | `me-1` | `MUST_MIGRATE` |
| `src/components/TripEngineView.tsx` | 654 | `mr-1` | `me-1` | `MUST_MIGRATE` |
| `src/components/TripEngineView.tsx` | 675 | `mr-1` | `me-1` | `MUST_MIGRATE` |
| `src/components/TripEngineView.tsx` | 698 | `mr-1` | `me-1` | `MUST_MIGRATE` |
| `src/components/TripEngineView.tsx` | 958 | `ArrowRight` | `Logical directional flip required (e.g. rtl:rotate-180)` | `MUST_MIGRATE` |
| `src/components/TripEngineView.tsx` | 976 | `ArrowRight` | `Logical directional flip required (e.g. rtl:rotate-180)` | `MUST_MIGRATE` |
| `src/components/TripEngineView.tsx` | 994 | `ArrowRight` | `Logical directional flip required (e.g. rtl:rotate-180)` | `MUST_MIGRATE` |
| `src/components/TripEngineView.tsx` | 1012 | `ArrowRight` | `Logical directional flip required (e.g. rtl:rotate-180)` | `MUST_MIGRATE` |
| `src/components/TripEngineView.tsx` | 1030 | `ArrowRight` | `Logical directional flip required (e.g. rtl:rotate-180)` | `MUST_MIGRATE` |

## 5. Non-Destructive Invariance Guarantees

- **No Application Strings Modified:** Arabic UI strings remain 100% identical.
- **No Codemod Executed:** Components continue serving literal strings in production.
- **Complete Key Alignment:** 100% of keys exist in all 3 language slots with explicit status.
- **Business Data Intact:** Calculations, Firestore, pricing, reports, and weight state machines remain untouched.
