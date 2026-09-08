# Formwrite

Multitenant forms built entirely on [Appwrite](https://appwrite.io), rendered fully on the server with SvelteKit and styled with Tailwind CSS.

- **Auth**: email one-time passwords only. No passwords, no client-side SDK.
- **Tenancy**: every workspace is an Appwrite Team. Owners, editors and viewers are team roles.
- **Data**: Appwrite DocumentsDB (schemaless, MongoDB-backed) on a dedicated database.
- **Isolation**: each tenant gets its own `forms_<teamId>` and `submissions_<teamId>` collections and its own storage bucket, all permissioned to `Role.team(teamId)` only.

## How isolation works

| Resource               | ID                     | Read         | Write                                    |
| ---------------------- | ---------------------- | ------------ | ---------------------------------------- |
| Forms collection       | `forms_<teamId>`       | team members | owners and editors                       |
| Submissions collection | `submissions_<teamId>` | team members | server only (delete: owners and editors) |
| Uploads bucket         | `<teamId>`             | team members | server only (delete: owners and editors) |

Every dashboard request runs through a **session client** bound to the signed-in user's Appwrite session, so Appwrite's permission engine decides what can be read or changed. Application code never filters tenant data itself.

The **API key client** is used only where Appwrite cannot act on a user's behalf:

- sending OTP codes and exchanging them for sessions
- provisioning and destroying a tenant's collections and bucket when a workspace is created or deleted
- reading a published form and storing an anonymous respondent's submission (always addressed by `teamId` + `formId`, so a form ID can never resolve across tenants)
- adding members by email (owner check enforced in-app first)

## Forms

- **Nine question types**: short text, long text, email, number, date, dropdown, single choice, multiple choice, file upload.
- **Sections** are field-type `section` markers with a title and description. On a single-page form they render as headings; with the "One section per step" layout each section becomes its own step with a progress bar, Back/Next navigation and per-step validation. Every step is server-rendered, so the form still works without JavaScript and server-side errors jump to the right step.
- **Design** per form: accent color (presets or custom), background (plain, soft tint, gradient, dark), corner radius, font family, layout, submit button label and a "Powered by Formwrite" toggle. The theme is stored on the form document, sanitized server-side in `src/lib/theme.ts`, and applied through CSS custom properties consumed by the `.fw-theme` rules in `src/routes/layout.css`. The editor's live preview uses the same code path as the public page.

## Routes

| Path                                            | Purpose                                      |
| ----------------------------------------------- | -------------------------------------------- |
| `/login`, `/login/verify`                       | Email OTP sign-in with a security phrase     |
| `/app`                                          | Workspaces you belong to, create a workspace |
| `/app/[team]`                                   | Forms in the workspace                       |
| `/app/[team]/forms/[formId]`                    | Form builder, publish toggle, share link     |
| `/app/[team]/forms/[formId]/submissions`        | Responses table, delete, pagination          |
| `/app/[team]/forms/[formId]/submissions/export` | CSV export                                   |
| `/app/[team]/files/[fileId]`                    | Streams an upload to a workspace member      |
| `/app/[team]/settings`                          | Rename, members and roles, delete workspace  |
| `/f/[team]/[formId]`                            | Public form for respondents                  |

## Setup

1. Copy `.env.example` to `.env` and fill in the endpoint, project ID, API key and database ID.
2. In the Appwrite project, enable the **Email OTP** auth method and create a **DocumentsDB** database (a dedicated specification is required on Appwrite Cloud). The key needs these scopes: `sessions.write`, `users.read`, `users.write`, `teams.read`, `teams.write`, `documentsdb.*`, `buckets.read`, `buckets.write`, `files.read`, `files.write`.
3. Install and run:

```sh
npm install
npm run dev
```

## Checks

```sh
npm run check          # svelte-check
npm run lint           # prettier + eslint
node scripts/e2e.mjs          # end-to-end smoke test against a running dev server
node scripts/screenshots.mjs  # seeds a demo workspace and screenshots every page with headless Edge/Chrome
```

The smoke test mints a throwaway user session with the API key, drives every route like a browser, verifies tenant isolation against a second user, and cleans up everything it created.
