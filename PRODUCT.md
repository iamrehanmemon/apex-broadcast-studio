# Product

## Register

product

## Users

HR/Communications team members at a company, composing and sending internal announcement emails (promotions, policy updates, birthdays, condolences, newsletters, awards, etc.). Small, named team — not a broad self-serve tool. They work in short bursts: pick a template, fill in bilingual (English/Arabic) content, preview, test-send to themselves, then broadcast to the organization's distribution list.

Secondary audience: the builder is also shipping this as a public portfolio piece (shared on LinkedIn) to demonstrate Power Platform Code Apps capability and pitch the real build internally — so the interface must read as a premium, intentional product, not an internal admin tool.

## Product Purpose

Eliminate the manual hours spent reformatting every internal announcement from scratch. Standardize on a template library so any authorized author can produce a consistent, on-brand, bilingual email in minutes instead of hours, with a built-in test-send safety step before the real broadcast.

## Brand Personality

Lamborghini automotive brand system, applied directly: true black, gold, uncompromising, theatrical, precise. The interface should feel like a supercar configurator, not a CRUD form — every screen is a stage, not a spreadsheet.

## Anti-references

Generic SaaS admin panels, cream/beige AI-default palettes, glassmorphism-everywhere, identical rounded card grids, gradient text, side-stripe accent borders, soft wide drop shadows paired with 1px borders ("ghost card" cliché).

## Design Principles

- Darkness as whitespace — black is the canvas, gold is reserved exclusively for the one primary action per screen.
- Uppercase is the default voice for display type; the brand is always shouting, never whispering.
- Sharp, angular, zero-radius surfaces — curves are reserved only for the rare toggle/badge.
- Depth through surface-color layering (black → charcoal → lighter gray), never through shadows.
- Bilingual is a first-class layout concern, not an afterthought toggle — English and Arabic both ship in every send.

## Accessibility & Inclusion

Body text and interactive labels must hold WCAG AA contrast (≥4.5:1) against true black — plain gray-on-black at low opacity is the most likely failure mode and must be checked directly, not assumed from the reference site (which is marketing, not an accessible app). RTL rendering for Arabic content must be correct (dir="rtl", proper text alignment) in both the live editor and the final emailed HTML, since mail clients don't share the app's font stack.
