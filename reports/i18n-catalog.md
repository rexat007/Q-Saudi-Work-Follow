# i18n Catalog Extraction & Translation-Key Architecture Report (BLOCK 41)

**Generated At:** 2026-09-12T08:39:47.323Z
**Scope:** Read-only AST catalog analysis for existing application codebase.

## 1. Executive Summary Metrics

| Metric | Count | Description |
| :--- | :--- | :--- |
| **Total Files Scanned** | 221 | TypeScript and TSX files analyzed in `src/` |
| **Total Extracted Candidates** | 23648 | Total strings and text nodes parsed |
| **Real User-Facing Texts** | 7272 | Confirmed visible Arabic and UI texts |
| **Likely User-Facing Texts** | 326 | English UI text in visible elements |
| **Ambiguous Texts** | 6594 | Short or context-isolated tokens for manual review |
| **Technical Strings** | 6867 | CSS classes, paths, enums, regexes, operators |
| **Non-User-Facing Strings** | 2589 | Internal IDs, collection names, database keys |
| **Distinct Proposed Keys** | 6419 | Hierarchical keys generated (e.g. `shared.actions.save`) |
| **Duplicate Groups** | 2393 | Sets of identical/normalized recurring texts |
| **Semantic Conflict Groups** | 305 | Identical texts requiring distinct contextual keys |
| **Keys Requiring Review** | 8101 | Entries flagged with special cases or ambiguity |
| **High / Critical Risk Hotspots** | 1981 | Concatenations, templates, or business data overlaps |

## 2. Category Distribution

| Semantic Category | User-Facing Strings | Description |
| :--- | :--- | :--- |
| `other` | 1620 | Classified operational domain |
| `imports` | 1434 | Classified operational domain |
| `trips` | 629 | Classified operational domain |
| `security` | 452 | Classified operational domain |
| `reports` | 449 | Classified operational domain |
| `weighbridge` | 389 | Classified operational domain |
| `pricing` | 349 | Classified operational domain |
| `entityResolution` | 339 | Classified operational domain |
| `offline` | 306 | Classified operational domain |
| `navigation` | 244 | Classified operational domain |
| `exceptions` | 231 | Classified operational domain |
| `legacyMigration` | 230 | Classified operational domain |
| `loading` | 222 | Classified operational domain |
| `unloading` | 199 | Classified operational domain |
| `dashboard` | 185 | Classified operational domain |
| `projects` | 164 | Classified operational domain |
| `materials` | 53 | Classified operational domain |
| `carriers` | 52 | Classified operational domain |
| `validation` | 16 | Classified operational domain |
| `trucks` | 15 | Classified operational domain |
| `drivers` | 11 | Classified operational domain |
| `authentication` | 9 | Classified operational domain |
| `shared` | 0 | Classified operational domain |

## 3. Directional (RTL / LTR) Class Inventory

- **Total Directional Usages Detected:** 324
- **Must Migrate (Physical to Logical):** 229 (e.g. `text-left` -> `text-start`, `pl-` -> `ps-`)
- **Probably Safe / Technical:** 95

### Directional Classes Sample (First 15 Entries)

| File | Line | Class / Icon | Type | Risk | Suggested Replacement |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/App.tsx` | 454 | `mr-0.5` | margin | `MUST_MIGRATE` | `me-0.5` |
| `src/App.tsx` | 717 | `ChevronLeft` | icon | `MUST_MIGRATE` | `Logical directional flip required (e.g. rtl:rotate-180)` |
| `src/App.tsx` | 742 | `ChevronLeft` | icon | `MUST_MIGRATE` | `Logical directional flip required (e.g. rtl:rotate-180)` |
| `src/components/FirestoreArchitectureView.tsx` | 470 | `text-left` | text-alignment | `MUST_MIGRATE` | `text-start` |
| `src/components/FirestoreArchitectureView.tsx` | 528 | `pr-1` | padding | `MUST_MIGRATE` | `pe-1` |
| `src/components/FirestoreArchitectureView.tsx` | 719 | `border-rose-200` | border | `PROBABLY_SAFE` | `border-rose-200` |
| `src/components/TripEngineView.tsx` | 609 | `mr-1` | margin | `MUST_MIGRATE` | `me-1` |
| `src/components/TripEngineView.tsx` | 630 | `mr-1` | margin | `MUST_MIGRATE` | `me-1` |
| `src/components/TripEngineView.tsx` | 654 | `mr-1` | margin | `MUST_MIGRATE` | `me-1` |
| `src/components/TripEngineView.tsx` | 675 | `mr-1` | margin | `MUST_MIGRATE` | `me-1` |
| `src/components/TripEngineView.tsx` | 698 | `mr-1` | margin | `MUST_MIGRATE` | `me-1` |
| `src/components/TripEngineView.tsx` | 770 | `border-rose-200` | border | `PROBABLY_SAFE` | `border-rose-200` |
| `src/components/TripEngineView.tsx` | 777 | `border-rose-300` | border | `PROBABLY_SAFE` | `border-rose-300` |
| `src/components/TripEngineView.tsx` | 958 | `ArrowRight` | icon | `MUST_MIGRATE` | `Logical directional flip required (e.g. rtl:rotate-180)` |
| `src/components/TripEngineView.tsx` | 976 | `ArrowRight` | icon | `MUST_MIGRATE` | `Logical directional flip required (e.g. rtl:rotate-180)` |

## 4. Semantic Conflict Groups Sample

Identical visible text appearing across different operational domains with distinct contextual intent.

| Text | Occurrences | Reason | Distinct Contexts & Keys |
| :--- | :--- | :--- | :--- |
| "كجم" | 41 | Identical string "كجم" occurs in multiple semantic contexts with distinct keys (trips.labels.txt_18471c, security.labels.txt_18471c, dashboard.labels.txt_18471c, entityResolution.labels.txt_18471c, imports.labels.txt_18471c, weighbridge.labels.txt_18471c, other.labels.txt_18471c, loading.labels.txt_18471c, unloading.labels.txt_18471c). | `trips` (trips.labels.txt_18471c)<br/>`security` (security.labels.txt_18471c)<br/>`dashboard` (dashboard.labels.txt_18471c)<br/>`entityResolution` (entityResolution.labels.txt_18471c)<br/>`imports` (imports.labels.txt_18471c)<br/>`weighbridge` (weighbridge.labels.txt_18471c)<br/>`other` (other.labels.txt_18471c)<br/>`loading` (loading.labels.txt_18471c)<br/>`unloading` (unloading.labels.txt_18471c)<br/>`other` (other.labels.txt_18471c)<br/>`other` (other.labels.txt_18471c)<br/>`other` (other.labels.txt_18471c)<br/>`other` (other.labels.txt_18471c)<br/>`other` (other.labels.txt_18471c) |
| "إلغاء" | 40 | Identical string "إلغاء" occurs in multiple semantic contexts with distinct keys (trips.actions.cancel, security.actions.cancel, entityResolution.actions.cancel, exceptions.actions.cancel, imports.actions.cancel, other.actions.cancel, legacyMigration.actions.cancel, pricing.actions.cancel, materials.actions.cancel, carriers.actions.cancel, projects.actions.cancel). | `trips` (trips.actions.cancel)<br/>`security` (security.actions.cancel)<br/>`entityResolution` (entityResolution.actions.cancel)<br/>`exceptions` (exceptions.actions.cancel)<br/>`imports` (imports.actions.cancel)<br/>`other` (other.actions.cancel)<br/>`legacyMigration` (legacyMigration.actions.cancel)<br/>`pricing` (pricing.actions.cancel)<br/>`materials` (materials.actions.cancel)<br/>`carriers` (carriers.actions.cancel)<br/>`projects` (projects.actions.cancel)<br/>`other` (other.actions.cancel)<br/>`other` (other.actions.cancel)<br/>`other` (other.actions.cancel)<br/>`other` (other.actions.cancel)<br/>`other` (other.actions.cancel)<br/>`other` (other.actions.cancel)<br/>`other` (other.actions.cancel) |
| "رقم التذكرة" | 35 | Identical string "رقم التذكرة" occurs in multiple semantic contexts with distinct keys (imports.fields.ticketNumber, weighbridge.fields.ticketNumber, loading.fields.ticketNumber, other.fields.ticketNumber, legacyMigration.fields.ticketNumber). | `imports` (imports.fields.ticketNumber)<br/>`weighbridge` (weighbridge.fields.ticketNumber)<br/>`loading` (loading.fields.ticketNumber)<br/>`other` (other.fields.ticketNumber)<br/>`other` (other.fields.ticketNumber)<br/>`imports` (imports.fields.ticketNumber)<br/>`imports` (imports.fields.ticketNumber)<br/>`imports` (imports.fields.ticketNumber)<br/>`other` (other.fields.ticketNumber)<br/>`other` (other.fields.ticketNumber)<br/>`legacyMigration` (legacyMigration.fields.ticketNumber)<br/>`weighbridge` (weighbridge.fields.ticketNumber)<br/>`weighbridge` (weighbridge.fields.ticketNumber)<br/>`weighbridge` (weighbridge.fields.ticketNumber) |
| "الشركة الشرقية للنقل" | 34 | Identical string "الشركة الشرقية للنقل" occurs in multiple semantic contexts with distinct keys (imports.labels.txt_95f5e9, entityResolution.labels.txt_95f5e9). | `imports` (imports.labels.txt_95f5e9)<br/>`imports` (imports.labels.txt_95f5e9)<br/>`imports` (imports.labels.txt_95f5e9)<br/>`imports` (imports.labels.txt_95f5e9)<br/>`imports` (imports.labels.txt_95f5e9)<br/>`imports` (imports.labels.txt_95f5e9)<br/>`imports` (imports.labels.txt_95f5e9)<br/>`entityResolution` (entityResolution.labels.txt_95f5e9)<br/>`entityResolution` (entityResolution.labels.txt_95f5e9)<br/>`entityResolution` (entityResolution.labels.txt_95f5e9)<br/>`entityResolution` (entityResolution.labels.txt_95f5e9)<br/>`entityResolution` (entityResolution.labels.txt_95f5e9)<br/>`entityResolution` (entityResolution.labels.txt_95f5e9)<br/>`entityResolution` (entityResolution.labels.txt_95f5e9)<br/>`entityResolution` (entityResolution.labels.txt_95f5e9)<br/>`imports` (imports.labels.txt_95f5e9) |
| "1010-أ ب ج" | 32 | Identical string "1010-أ ب ج" occurs in multiple semantic contexts with distinct keys (imports.labels.txt_6dd358, entityResolution.labels.txt_6dd358). | `imports` (imports.labels.txt_6dd358)<br/>`imports` (imports.labels.txt_6dd358)<br/>`imports` (imports.labels.txt_6dd358)<br/>`imports` (imports.labels.txt_6dd358)<br/>`entityResolution` (entityResolution.labels.txt_6dd358)<br/>`entityResolution` (entityResolution.labels.txt_6dd358)<br/>`entityResolution` (entityResolution.labels.txt_6dd358)<br/>`entityResolution` (entityResolution.labels.txt_6dd358)<br/>`entityResolution` (entityResolution.labels.txt_6dd358)<br/>`imports` (imports.labels.txt_6dd358) |
| "الناقل" | 32 | Identical string "الناقل" occurs in multiple semantic contexts with distinct keys (security.labels.carrier_2, dashboard.labels.carrier_2, entityResolution.labels.carrier_4, imports.labels.carrier_7, weighbridge.labels.carrier, other.labels.carrier_2, legacyMigration.labels.carrier_3, pricing.labels.carrier, reports.labels.carrier, loading.fields.carrier, loading.labels.carrier_5, reports.fields.carrier_4). | `security` (security.labels.carrier_2)<br/>`dashboard` (dashboard.labels.carrier_2)<br/>`entityResolution` (entityResolution.labels.carrier_4)<br/>`imports` (imports.labels.carrier_7)<br/>`weighbridge` (weighbridge.labels.carrier)<br/>`other` (other.labels.carrier_2)<br/>`legacyMigration` (legacyMigration.labels.carrier_3)<br/>`pricing` (pricing.labels.carrier)<br/>`reports` (reports.labels.carrier)<br/>`loading` (loading.fields.carrier)<br/>`loading` (loading.labels.carrier_5)<br/>`other` (other.labels.carrier_2)<br/>`imports` (imports.labels.carrier_7)<br/>`reports` (reports.fields.carrier_4)<br/>`other` (other.labels.carrier_2)<br/>`weighbridge` (weighbridge.labels.carrier) |
| "الوزن الصافي" | 24 | Identical string "الوزن الصافي" occurs in multiple semantic contexts with distinct keys (unloading.fields.netWeight, other.fields.netWeight, imports.fields.netWeight, weighbridge.fields.netWeight). | `unloading` (unloading.fields.netWeight)<br/>`other` (other.fields.netWeight)<br/>`other` (other.fields.netWeight)<br/>`imports` (imports.fields.netWeight)<br/>`imports` (imports.fields.netWeight)<br/>`other` (other.fields.netWeight)<br/>`other` (other.fields.netWeight)<br/>`weighbridge` (weighbridge.fields.netWeight)<br/>`weighbridge` (weighbridge.fields.netWeight) |
| "مؤسسة الرمال السريعة" | 23 | Identical string "مؤسسة الرمال السريعة" occurs in multiple semantic contexts with distinct keys (imports.labels.txt_1e149b, entityResolution.labels.txt_1e149b). | `imports` (imports.labels.txt_1e149b)<br/>`imports` (imports.labels.txt_1e149b)<br/>`imports` (imports.labels.txt_1e149b)<br/>`imports` (imports.labels.txt_1e149b)<br/>`entityResolution` (entityResolution.labels.txt_1e149b)<br/>`entityResolution` (entityResolution.labels.txt_1e149b)<br/>`entityResolution` (entityResolution.labels.txt_1e149b)<br/>`entityResolution` (entityResolution.labels.txt_1e149b)<br/>`entityResolution` (entityResolution.labels.txt_1e149b)<br/>`entityResolution` (entityResolution.labels.txt_1e149b)<br/>`entityResolution` (entityResolution.labels.txt_1e149b) |
| "أ ب ج 1234" | 19 | Identical string "أ ب ج 1234" occurs in multiple semantic contexts with distinct keys (other.labels.txt_5045a4, entityResolution.fields.txt_5045a4, trips.labels.txt_5045a4, legacyMigration.labels.txt_5045a4). | `other` (other.labels.txt_5045a4)<br/>`entityResolution` (entityResolution.fields.txt_5045a4)<br/>`other` (other.labels.txt_5045a4)<br/>`other` (other.labels.txt_5045a4)<br/>`other` (other.labels.txt_5045a4)<br/>`trips` (trips.labels.txt_5045a4)<br/>`legacyMigration` (legacyMigration.labels.txt_5045a4)<br/>`legacyMigration` (legacyMigration.labels.txt_5045a4)<br/>`legacyMigration` (legacyMigration.labels.txt_5045a4)<br/>`legacyMigration` (legacyMigration.labels.txt_5045a4) |
| "المادة" | 19 | Identical string "المادة" occurs in multiple semantic contexts with distinct keys (dashboard.labels.material_2, entityResolution.labels.material_3, imports.labels.material_2, legacyMigration.labels.material_3, pricing.labels.material_2, reports.labels.material, loading.fields.material, loading.labels.material_4, unloading.labels.material, weighbridge.labels.material_2, other.labels.material_13, reports.fields.material_3). | `dashboard` (dashboard.labels.material_2)<br/>`entityResolution` (entityResolution.labels.material_3)<br/>`imports` (imports.labels.material_2)<br/>`legacyMigration` (legacyMigration.labels.material_3)<br/>`pricing` (pricing.labels.material_2)<br/>`reports` (reports.labels.material)<br/>`loading` (loading.fields.material)<br/>`loading` (loading.labels.material_4)<br/>`unloading` (unloading.labels.material)<br/>`weighbridge` (weighbridge.labels.material_2)<br/>`other` (other.labels.material_13)<br/>`imports` (imports.labels.material_2)<br/>`reports` (reports.fields.material_3) |

## 5. High-Risk Hotspots & Special Cases

- **Concatenated Strings (`+`):** 9
- **Template Literals (`${...}`):** 607
- **Interpolation Placeholders (`{...}`):** 206
- **Mixed Numbers & Units:** 753
- **Currency String Usages:** 357
- **Unit String Usages:** 662
- **Protected Business Field Matches:** 275

## 6. Safety & Non-Destructive Invariance Confirmation

- **No Code Modifications:** Zero application strings were rewritten or modified.
- **No Calling `t()` across app:** No automated codemod was executed.
- **Business Logic Invariance:** Pricing, reports, weighbridge, offline, and state machines are 100% untouched.
- **Deterministic Reproducibility:** Every catalog run generates identical keys and hashes.
