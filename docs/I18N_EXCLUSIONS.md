# I18N Scanner Exclusions

The scanner does **not** use a blanket suppression. It reports excluded classifications so they remain auditable.

| Classification | Exclusion rule | Reason |
|---|---|---|
| `TECHNICAL_IDENTIFIER` | URLs, filesystem paths, dotted identifiers, all-caps technical tokens, file names such as `.md/.json/.csv/.xlsx/.pdf` | These are identifiers/contracts, not translatable UI copy. |
| `CODE_VALUE` | `null`, `undefined`, `true`, `false`, `NaN`, `Infinity` | Runtime/code values; translating them would change behavior or display semantics. |
| `TEST_FIXTURE` | Files under `src/tests/` | Test data and assertions must remain stable and are not application UI. |
| `INTENTIONAL_NON_TRANSLATABLE` | Explicit code snippets such as `createEvent(...)`, `createTrip()`, `transition(...)`; technical tokens such as `KG`, `SAR`, `PDF`, `ID:` and `UUID` | These tokens are part of technical examples, units, identifiers, or interoperability contracts. |

## Guardrail

The classifier is conservative. If a value could reasonably be visible UI copy and does not match a narrowly defined technical rule, it remains `REAL_USER_FACING` and therefore blocks the strict gate.

No rule in this file is intended to suppress normal labels, headings, buttons, validation messages, notifications, empty states, dialogs, or route content.
