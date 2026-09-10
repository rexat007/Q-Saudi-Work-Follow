# Language QA Checklist

## Supported locales
- [ ] العربية (`ar`) — RTL
- [ ] English (`en`) — LTR
- [ ] اردو (`ur`) — RTL
- [x] Language selector displays exactly: العربية / English / اردو
- [x] Locale persists in localStorage
- [x] `<html lang>` and `<html dir>` update with the selected locale
- [x] No cross-language fallback: missing keys render an explicit `[missing:<locale>:<key>]` marker

## Coverage audit
- [ ] Login
- [ ] Dashboard
- [ ] Projects
- [ ] Project Setup
- [ ] Carriers
- [ ] Materials
- [ ] Pricing
- [ ] Trucks
- [ ] Drivers
- [ ] Loading
- [ ] Unloading
- [ ] Trips
- [ ] Import Center
- [ ] Weighbridge Import
- [ ] Exceptions
- [ ] Audit
- [ ] Sync Center
- [ ] Reports
- [ ] Admin
- [ ] Settings
- [ ] Every component
- [ ] Every modal/drawer
- [ ] Every validation message
- [ ] Every toast/notification

## RTL/LTR visual QA
- [ ] Arabic navigation, spacing, icons and text alignment
- [ ] Urdu navigation, spacing, icons and text alignment
- [ ] English navigation, spacing, icons and text alignment
- [ ] Modal/dialog anchoring and close controls
- [ ] Action button order and icon placement
- [ ] Tables and data grids
- [ ] Horizontal scrolling and sticky columns
- [ ] Numeric inputs remain LTR/usable inside RTL screens
- [ ] Dates and times remain readable
- [ ] Print preview in Arabic
- [ ] Print preview in Urdu
- [ ] Print preview in English

## Functional regression
- [ ] Login/authentication unchanged
- [ ] Project setup unchanged
- [ ] Pricing calculations unchanged
- [ ] Loading/unloading weight calculations unchanged
- [ ] Trip state machine unchanged
- [ ] Import/migration behavior unchanged
- [ ] Exception workflow unchanged
- [ ] Audit behavior unchanged
- [ ] Offline/sync behavior unchanged
- [ ] Reports/export behavior unchanged
- [ ] Admin permissions unchanged

## Required automated checks
- [ ] TypeScript compile (`npm run lint`)
- [ ] Production build (`npm run build`)
- [ ] Locale key parity check
- [ ] Static hardcoded-user-facing-string scan
- [ ] RTL/LTR browser smoke test
- [ ] Print smoke test
