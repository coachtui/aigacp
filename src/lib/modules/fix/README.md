# Fix Module — Platform Integration Guide

## How the platform launches Fix

All Fix launches go through one utility:

```ts
import { buildFixUrl } from "@/lib/modules/fix/launch";
import { FixLaunchButton } from "@/components/modules/fix/FixLaunchButton";
```

Never construct `/modules/fix?...` URLs by hand in page files.

---

## Launch utility

```ts
buildFixUrl(ctx: FixLaunchContext): string
```

Builds the correct URL for the current mode (integrated or standalone).
Safe to call in server components, client components, and utilities.

### FixLaunchContext

| Param         | Required | Description                                           |
|--------------|----------|-------------------------------------------------------|
| `source`      | Yes      | Stable identifier for the originating surface         |
| `issueId`     | No       | Issue being acted on                                  |
| `assetId`     | No       | Asset linked to the issue                             |
| `alertId`     | No       | Alert that triggered the launch                       |
| `projectId`   | No       | Current project                                       |
| `orgId`       | No       | Current org                                           |
| `role`        | No       | Current user role                                     |
| `sourceLabel` | No       | Human-readable label for the source surface           |
| `returnTo`    | No       | Platform URL Fix should navigate back to — include when possible |

### Stable source names

```
dashboard
issue-detail
issues-list
project-command-center
project-assets
alerts-list
alert-detail
```

Do not invent new source names without updating this list and `FixSource` in `launch.ts`.

---

## FixLaunchButton component

Renders a Link (integrated) or `<a target="_blank">` (standalone).
Handles both modes automatically.

```tsx
<FixLaunchButton
  context={{ source: "issue-detail", issueId: "123", assetId: "cat330", returnTo: "/issues/123" }}
  label="Open in Fix"
  variant="primary"
/>
```

### Variants

| Variant   | Use when                                              |
|-----------|-------------------------------------------------------|
| `primary` | Main action bar (issue detail, alert detail)          |
| `outline` | Role CTA bars (dashboard, project command center)     |
| `ghost`   | Fix is one of several equal secondary actions         |
| `inline`  | Compact inline links inside issue rows / tight lists  |

---

## Integrated vs standalone mode

Controlled by environment variables:

```env
NEXT_PUBLIC_FIX_MODE=integrated       # default — routes to /modules/fix
NEXT_PUBLIC_FIX_MODE=standalone       # routes to external Fix app
NEXT_PUBLIC_FIX_BASE_URL=https://fix.aiga.app
```

In integrated mode, all Fix links are internal Next.js routes (`/modules/fix?...`).
In standalone mode, all Fix links point to the external Fix URL and open in a new tab.

No page-level code changes are needed to switch modes.

---

## Platform → Fix → return flow

### Current (Phase 1–2)
```
Platform page
  → buildFixUrl(ctx)        # constructs URL with returnTo
  → /modules/fix?...params  # Fix reads context, shows banner
  → user clicks "Back"      # Fix navigates to returnTo
```

### Future (Phase 3+)
```
Platform page
  → buildFixUrl(ctx)
  → Fix runs diagnostic session
  → Fix redirects to returnTo?fixResolution=resolved&diagnosticSessionId=abc
  → Platform reads FixReturnContext
  → Platform updates Issue, logs ActivityEvent, shows confirmation
```

See `src/lib/modules/fix/integration.ts` for the `FixReturnContext` type contract.

Future writeback endpoint: `/api/fix/callback` (not yet implemented).

---

## Platform launch surfaces

| Surface                       | Source name              | Params passed                              |
|------------------------------|--------------------------|---------------------------------------------|
| Dashboard role CTA (mechanic) | `dashboard`              | projectId, orgId, role, returnTo            |
| Issue detail action bar       | `issue-detail`           | issueId, assetId, projectId, returnTo       |
| Alert detail action bar       | `alert-detail`           | issueId, assetId, alertId, projectId, returnTo |
| Project CC role CTA           | `project-command-center` | projectId, returnTo                         |
| Project CC issue row          | `project-command-center` | issueId, assetId, projectId, returnTo       |
| Project CC module actions     | `project-command-center` | projectId, returnTo                         |
