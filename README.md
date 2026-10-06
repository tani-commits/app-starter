# app-starter

A reusable foundation for Tanika's CRM-style apps. It was lifted from a Base44 app called ClientHub and cleaned so the next app can start from the patterns, not from that product's name.

The UI is Vite, React, Tailwind, and shadcn/ui. Staff screens talk to one shared action layer. The same actions are what agents call. Writes are checked, audited, and — when they are destructive — queued for a person to approve.

## What you get

- **One action layer.** `base44/functions/*/entry.ts` is the only place that changes data. Pages call it through `src/hooks/useAction.js` (`useActionQuery`, `useActionMutation`). Agents call the same functions. The catalogue lives in `base44/shared/catalog.ts` and is served by `actionsCatalog`.
- **Staff auth and a real data wall.** The React route guard (`ProtectedRoute`) only hides pages. Access is decided again on the server in `base44/shared/principal.ts`, and each entity JSONC file has its own row rules. A client role is read-only. An admin is unscoped. Everyone else is limited to the `account_ids` on their user. Agents authenticate with an API key and are scoped to the accounts on their Agent record.
- **Approvals.** Deleting a client account, any bulk delete, and running an automation do not happen immediately. They create an `ApprovalRequest`. `approvalActions` lets an admin or manager approve or reject.
- **Audit.** `base44/shared/audit.ts` writes an `AuditLog` row for each action and emits an `Event` for state changes.
- **Screens that say what is going on.** `src/components/StateViews.jsx` has loading (`TableSkeleton`), empty, error, not-found, permission-denied, and an offline banner. Account and contact pages use them.
- **Confirm, then undo where it is safe.** `ConfirmDialog` asks before a destructive submit. Archiving a contact shows a toast with Undo, which sets the contact back to active.
- **Four views per module, where the UI was copied.** Accounts and contacts each have a list, a detail page, a create/edit form, and a confirm step for the dangerous action (delete for accounts, archive for contacts).
- **Validation in two places.** Forms check required fields before they submit. `makeCrudHandler` checks the same required fields again and returns `VALIDATION_ERROR`.

Brand text (the name in the sidebar, the document title) comes from `app.config.json`. Override it with `VITE_APP_NAME` and the other `VITE_APP_*` values in `.env.local`. See `.env.example`.

There is no Base44 app id, no preview URL, and no secret in this repo. The ClientHub hand copy did not contain an app id or a `client-rainbow-core-flow` URL. Put those in `.env.local` when you link a real app.

## How to run it

You need Node.js 20 or newer.

Frontend only (what `npm run build` checks):

```bash
npm install
cp .env.example .env.local
npm run dev
```

Leave the Base44 values blank and the login and register screens still render. Data calls fail until a backend is connected. That is expected.

With the Base44 backend (entities, functions, and auth on your machine):

1. Install the [Base44 CLI](https://docs.base44.com/developers/references/cli/get-started/overview) and [Deno](https://docs.deno.com/runtime/getting_started/installation/).
2. `base44 login`
3. `base44 link` — this writes `base44/.app.jsonc`, which is gitignored. Put the same app id in `VITE_BASE44_APP_ID`.
4. `base44 dev` — starts the local backend and the frontend. Do not also run `npm run dev`, or you will be looking at a second Vite with no API behind it.

`npm run build` produces the static frontend in `dist/`. The Base44 plugin warns if `VITE_BASE44_APP_ID` is empty. That warning is correct for this template.

## How to add a module

Copy the accounts module. It is the complete shape: entity, action, catalogue entry, and four views.

1. **Entity.** Add `base44/entities/Thing.jsonc`. Give it `account_id` (unless the record *is* the tenant, like ClientAccount). Set `required`. Copy the `rls` block from `ClientAccount.jsonc` or `Contact.jsonc` and keep the admin bypass and the `account_ids` check. The UI cannot be the only wall.
2. **Action.** Add `base44/functions/thingActions/entry.ts`:

   ```ts
   import { makeCrudHandler } from "../../shared/crud.ts";

   export default makeCrudHandler("Thing", {
     required: ["account_id", "name"],
     statusField: "status"
   });
   ```

   `makeCrudHandler` already does list, get, create, update, archive, delete, and bulkDelete, plus scope, audit, and approval for high-impact deletes. Add a separate function only when the action is not plain CRUD (see `moveDealStage` or `logActivity`).
3. **Catalogue.** Add `thingActions` under `actions` in `base44/shared/catalog.ts`. Agents discover tools from `actionsCatalog`. If it is not in the catalogue, it is invisible to them.
4. **Four pages.**
   - `src/pages/Things.jsx` — list. Use `useActionQuery("thingActions", { action: "list" })`. Show `TableSkeleton` while loading, `EmptyState` when there are no rows, `ErrorState` when the query fails.
   - `src/pages/ThingDetail.jsx` — one record. `NOT_FOUND` renders `NotFoundState`.
   - `src/pages/ThingForm.jsx` — create and edit, same component, switched on the `:id` param. Validate in the form, then call `create` or `update`.
   - Delete is a `ConfirmDialog` on the list and the detail page, not a separate URL. If the delete should not happen immediately, route it through approval the way account delete does (`highImpactDeletes`, or the ClientAccount special case inside `crud.ts`).
5. **Wire it.** Register the four routes in `src/App.jsx` inside the protected `Layout`. Add a nav item in `src/components/Sidebar.jsx`. Add the route and the action to `features.manifest.json`. Add a row to `docs/FEATURE-REGISTER.md` when the work is agreed.

Sidebar already links to leads, pipeline, deals, projects, tasks, activities, onboarding, automations, content, reports, agents, and settings. The backend actions for most of those exist. The pages were not in the hand copy, so those links 404. Build the pages before you treat the link as done.

## Foundation checklist

Use this before you call a module done. It maps to the foundation rules for these apps.

| Rule | What “done” means here | Where it lives now |
| --- | --- | --- |
| States | Every data screen has loading, empty, error, and not-found. Permission-denied and offline exist for when you need them. | `src/components/StateViews.jsx`. Accounts, contacts, and the dashboard use them. |
| Validation | The form rejects bad input before submit, and the action rejects it again with `VALIDATION_ERROR`. Required fields are listed on the handler and in the catalogue. | `AccountForm.jsx`, `ContactForm.jsx`, `makeCrudHandler` in `base44/shared/crud.ts`. |
| Auth edges, with a backend data wall | A hidden button is not security. Every action calls `resolvePrincipal`. Unauthenticated calls return `UNAUTHORIZED`. The wrong role returns `FORBIDDEN`. An agent touching another account returns `SCOPE_VIOLATION`. Entity `rls` enforces the same scope for human sessions. The `client` role cannot write. | `base44/shared/principal.ts`, `rls` in `base44/entities/*.jsonc`, role check in `crud.ts`. `ProtectedRoute` is only the front door. |
| Confirm and undo | Destructive actions open `ConfirmDialog` before they run. A reversible action (archive) shows a toast with Undo. Deletes that cannot be undone safely go to the approval queue instead of a silent delete. | `src/components/ConfirmDialog.jsx`, Undo on the contacts list, `base44/shared/approval.ts`. |
| Data edge tests | Cover the edges, not only the happy path: empty list, missing id (`NOT_FOUND`), missing required field (`VALIDATION_ERROR`), no session (`UNAUTHORIZED`), client attempting a write (`FORBIDDEN`), agent outside its accounts (`SCOPE_VIOLATION`), account delete and bulk delete (`APPROVAL_REQUIRED`, nothing deleted yet). | No test runner was in the hand copy. Add these when you add a module. Do not tick the box without a test or a written check in the feature register. |

## What is Base44-specific

These pieces only work on Base44. Leave them if you stay on Base44.

- `src/api/base44Client.js` and `src/lib/app-params.js` — the `@base44/sdk` client. App id, functions version, and app base URL come from `VITE_BASE44_*`.
- `@base44/vite-plugin` in `vite.config.js` — dev proxy, legacy import support, and the build-time app id check.
- `base44/functions/*/entry.ts` — Deno handlers run by the Base44 functions runtime. `waitUntil` is imported from `base44:runtime`. `principal.ts` imports `npm:@base44/sdk`.
- `base44/entities/*.jsonc` — schemas and row rules the Base44 data layer enforces. They are not SQL.
- `base44 dev`, `base44 link`, and the gitignored `base44/.app.jsonc`.
- `src/pages/OAuthConsent.jsx` — talks to `/api/apps/<appId>/mcp/...` on the Base44 host.
- The favicon in `index.html` points at `https://base44.com/logo_v2.svg`.

The parts you should keep in a port are the ones that are not tied to that host: the action envelope in `base44/shared/response.ts` (`{ ok, status, data }` or `{ ok: false, error: { code, message } }`), the catalogue, principal/scope rules, the approval queue, the audit log, `useAction`, `StateViews`, `ConfirmDialog`, and the four-view page shape.

## What you would swap for Supabase + Vercel

This repo does not do that swap. This is the map, if you take it later.

| Today | On Supabase + Vercel |
| --- | --- |
| `@base44/sdk` client | `supabase-js` in the browser, using the anon key. No service role in the client. |
| `base44.auth` (email, Google, OTP, reset) | Supabase Auth. Keep `AuthContext` as the place the UI asks “who is logged in”, and point it at Supabase. |
| `base44/functions/*/entry.ts` | Vercel Route Handlers (or one serverless function per action) that return the same JSON envelope. `useAction` then `fetch`s those routes instead of `base44.functions.invoke`. |
| `npm:@base44/sdk` and `base44:runtime` inside functions | The Supabase server client. `waitUntil` becomes `waitUntil` from `@vercel/functions`, or you just await the audit write. |
| Entity JSONC + Base44 RLS | Postgres tables and Supabase RLS policies that match the JSONC rules: admin sees all, everyone else is limited to `account_ids`, clients cannot write. |
| Agent API keys (`x-agent-id` / `x-agent-key`, hash stored on Agent) | The same check inside the route handler, using the service role only after the key matches. Do not trust the browser for that. |
| `@base44/vite-plugin` and `base44 dev` | Delete the plugin. Deploy the Vite app on Vercel. Run Postgres via Supabase. |
| `actionsCatalog` | Keep the catalogue. Serve it from a route so agents still discover tools. |

Do the swap as its own change. Do not mix it into a feature.

## Hand copy: what was missing

The source was copied file by file out of the Base44 editor. A few things were not in the archive. They are listed so you do not go looking for them.

- `src/components/ui/*` was left out on purpose (49 files marked shadcn-skip). They were regenerated with the shadcn CLI from `components.json`.
- `image.jsx`, `image-helpers.js`, `responsive-image.jsx`, and `use-responsive-image.jsx` were on that skip list but are not shadcn components, and nothing in this source imports them. They were not generated.
- `src/lib/AuthContext.jsx`, `src/lib/PageNotFound.jsx`, and `src/lib/authReturnTo.js` were imported and absent. They were rebuilt from the call sites and the Base44 SDK so the app compiles. `authReturnTo` only allows same-origin paths.
- `Home.jsx` and `OAuthConsent.jsx` are in `src/pages` and are not registered in `src/App.jsx`.
- Sidebar and topbar links for leads, pipeline, deals, projects, tasks, activities, onboarding, automations, content, reports, agents, settings, and search have no pages.
- `base44/config.jsonc` (the `site.serveCommand` file the Base44 CLI looks for) was not in the archive.
- `base44/mcp/config.json` was not in the archive. `OAuthConsent.jsx` comments refer to it.
- `public/manifest.json` is linked from `index.html` and was not in the archive.
- No app id, no `client-rainbow-core-flow` URL, and no secrets were in the archive.
- The manifest that came with the archive stops early. The tarball has the entities, shared helpers, layout, and sidebar that the manifest does not list. The tarball was treated as the source.
- There is no test suite.

`features.manifest.json` is the list of routes and actions to guard as you add modules. `docs/FEATURE-REGISTER.md` is the empty table for deliverables.
