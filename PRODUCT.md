# Recruitdesk
<!-- impeccable:product-schema 1 -->
## Platform
web
## Stack
Delegated by Ray: React, TypeScript, Vite, Tailwind, shadcn-style Radix components, Dexie IndexedDB. Local-only static app; no hosted service.
## Users
A personal recruiter managing candidates, jobs, companies and hiring relationships.
## Product Purpose
Maintain a searchable candidate library and track each candidate-job application with reliable private storage.
## Operating Context
Desktop-first, large candidate tables, quick edits, multiple simultaneous browser tabs. English UI. Import vendor CSV with Issue key mapped to cpmID.
## Capabilities and Constraints
No authentication, analytics, remote assets, external requests or backend. Full CRUD, field autosave with durable draft recovery, flexible profile entries, many-to-many applications (list and board), contacts, a Today follow-up view, bulk actions with undo, light/dark/system, keyboard shortcuts and a command palette. Saved views (search, filters, sort), salary parsing with sort/filter, and one-click copy of candidate email/phone. Validated, previewed imports with a field-by-field diff for existing records, and full JSON backups including settings and saved views. Duplicate updates require explicit confirmation. Browser storage is origin-specific and not encryption at rest.
## Brand Commitments
Clean, refined professional recruiter UI; Radix, shadcn and Tailwind. User delegates remaining design decisions. Primary color: light blue (explicit request, 17 October 2026).
## Evidence on Hand
Only CSV header schema is supplied. No candidate data. Any sample data must be fictional and explicitly opt-in.
## Product Principles
- Candidate identity is explicit and unique through cpmID.
- Preserve provenance and avoid silent overwrites.
- Data stays on this browser and exports remain user-controlled.
- Daily work is a searchable editable table, not a decorative dashboard.
- Actions are grouped by role: create/import in the page header, view tools (saved views, filters, export, list/board) in one joined control beside search.
- Feedback appears on the control that was used; toasts are reserved for events that are not tied to a control.
## Assumptions selected under delegated authority
Name Recruitdesk; Candidates default route; optional synthetic sample workspace; code-first implementation for a functional data-dense app.
