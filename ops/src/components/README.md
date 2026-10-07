# Operations UI components

Import shared controls from `./Workspace` (or `../components/Workspace` from a page).
The rail and top bar remain the workspace shell. Page components own data fetching,
authorization, filters, and actions; shared UI components own presentation and accessibility.

## Component map

| Component | Use |
| --- | --- |
| PageHeader | Page title, description, optional actions |
| SectionHeader | Section title, description, optional actions |
| Panel | Bordered content surface |
| Toolbar | Responsive search and filter layout |
| Button | Primary, secondary, danger, or ghost actions; optional busy state |
| Input / Select / Textarea | Native controlled form inputs, supporting refs and standard attributes |
| Field | Label and optional hint/error tied to an input ID |
| Table | Semantic table styling; compose native table rows and cells |
| TableState | Empty/loading message spanning a table's columns |
| Pagination | Bounded previous/next controls and record count |
| FilterTabs | Accessible single-choice filters with optional counts |
| MetricCard | Summary value, supporting text, optional navigation action |
| EmptyState | Empty or loading content with optional action |
| Notice | Info, success, warning, or error feedback |
| Badge / StatusBadge | Existing shared status vocabulary |
| Modal | Native modal dialog with focus containment, Escape close, and focus restoration |

## Usage

```tsx
<PageHeader title="Businesses" description="Find an account and check its balance." />
<Field label="Business name" htmlFor="business-name" hint="The name customers recognize.">
  <Input id="business-name" aria-describedby="business-name-hint" value={name}
    onChange={event => setName(event.target.value)} />
</Field>
<Button variant="primary" type="submit" busy={saving}>Save changes</Button>
<Notice tone="error">The change could not be saved. Try again.</Notice>
```

## Conventions

- Reuse these components when adding or updating a page. Keep page-specific business rules in the page.
- Buttons default to `type="button"`. Explicitly use `type="submit"` for form submission.
- Supply a label or `aria-label` for every form control and icon-only button.
- Connect Field hints/errors using `aria-describedby`; set `aria-invalid` on invalid controls.
- Use `variant="danger"` for destructive actions. Authorization and confirmations remain the page's responsibility.
- Tables use ordinary `thead`, `tbody`, `tr`, `th`, and `td` children. Keep table overflow on the containing surface.
- FilterTabs are toggle buttons, not ARIA tab panels; they filter a shared view.
- Reuse `workspace.css` for component changes. `workspace-content.css` contains page composition styles.
- Legacy page layout classes remain during adoption; new components should use variants rather than copy visual utility lists.
- Keep user-facing labels short and specific. Never fabricate operational states or values.

## Adoption

All operations pages use the shared buttons and tables where applicable. List pages use
shared title blocks and pagination. Detail and support forms use shared inputs and labeled
fields. Overview uses shared metric cards, panels, and filters. Existing Badge and Modal
imports remain compatible.
