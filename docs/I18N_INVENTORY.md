# I18N Inventory

## Scope

Inventory generated from the first real scanner artifact (`I18N_AUDIT_REPORT.json`) on branch `feat/full-i18n-ar-en-ur`.

| Metric | Count |
|---|---:|
| Initial scanner findings | 2,382 |
| Real user-facing candidates | 2,312 |
| Technical identifiers | 52 |
| Intentional non-translatable | 14 |
| Code values | 4 |
| Comments | 0 |
| Test fixtures | 0 in the initial report |
| Log-only | 0 |
| False positives | 0 classified by the conservative classifier |
| Translation keys already present | typed locale catalog exists; exact count produced by `bun run i18n:keys` |
| Newly migrated hardcoded strings | 0 at this checkpoint |
| Untranslated real user-facing findings | 2,312 |

## Interpretation

The 2,382 result is not 2,382 translation requirements. The audit contains technical/code values that are intentionally non-translatable. The classifier is conservative: anything not confidently technical remains `REAL_USER_FACING` so that exclusions cannot hide UI text.

The current branch has the i18n foundation and complete locale-resource shape for the keys already defined, but the component-by-component migration of the remaining real UI strings is **not complete**.

## Required completion criteria

- Every `REAL_USER_FACING` finding is migrated to the typed `t(...)` catalog.
- Arabic, English, and Urdu contain every used key.
- Technical identifiers and data values remain unchanged.
- RTL/LTR behavior is verified across the existing routes.
- Strict audit reports zero unexplained real user-facing findings.
