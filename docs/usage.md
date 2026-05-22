# Usage & features

- [Rendering & masking](#rendering--masking)
- [Click actions](#click-actions)
- [Autocomplete](#autocomplete)
- [Right-click menu](#right-click-menu)
- [The sidebar index](#the-sidebar-index)
- [Commands](#commands)
- [Settings reference](#settings-reference)

---

## Rendering & masking

Placeholders render in both **Reading mode** and **Live Preview**. In
Live Preview the placeholder text is hidden behind a widget; moving the
text cursor into it reveals the raw `{{...}}` so you can edit it.

The **Mask mode** setting controls how a resolved value is shown:

- **Never** (default) — the value is shown in clear text once resolved.
  The on-disk file still contains only the placeholder; masking is purely
  a shoulder-surfing / screen-share concern.
- **Always** — the value is always shown as dots.
- **Manual** — masked by default; click to reveal individually.

While a secret is being fetched a small spinner shows. If a fetch fails
the placeholder shows `[secret: error]`; hover for the reason. When the
failure is an auth error, an inline **Re-login** button appears.

## Click actions

Single-click and modifier-click (Ctrl/Cmd-click) on a resolved
placeholder are independently configurable:

- **Copy** (default for single-click) — copies the value to the clipboard.
- **Toggle mask** (default for modifier-click) — flips this placeholder
  between masked and revealed.
- **Do nothing**.

## Autocomplete

Typing `{{` in the editor triggers suggestions:

- `{{` alone → a picker of your enabled providers. Choosing one fills in
  `{{<prefix>:` and continues into that provider's secret list.
- `{{<text>` (no colon yet) → a fuzzy search across **every** enabled
  provider's secrets at once, each result labelled with its provider.
- `{{<prefix>:<query>` → the usual per-provider filtered list.

## Right-click menu

**Right-click on selected text** → *Save selection to <provider>* (one
item per enabled provider). Writes the selected text to that provider as
a new secret and replaces the selection with a placeholder.

**Right-click on a rendered placeholder** →

- **Copy resolved value** — clipboard only, no file change.
- **Edit secret value…** — opens a modal to change the stored value in
  the password manager. The placeholder text in the note does not change;
  only the backend secret does. You can optionally reveal the current
  value before overwriting it.
- **Replace with resolved value…** — replaces the placeholder text in the
  note with the actual secret. This *writes the secret to the `.md` file*
  and defeats the plugin's purpose, so it is gated behind a confirmation
  modal with a masked preview.

## The sidebar index

The ribbon icon (and the command *Secrets: Open placeholder index*)
opens a sidebar view that scans every markdown file in the vault for
placeholders and lists them grouped by provider → unique placeholder →
usage site.

- Click a usage row to jump to that note with the cursor on the line.
- Hover a placeholder row and click the pencil to **edit the secret
  value** for it.
- The filter box narrows the tree; the refresh button re-scans. The
  index also rebuilds automatically (debounced) when vault files change.

## Commands

All commands are under the `Secrets:` prefix in the command palette:

| Command | Action |
|---|---|
| Login to active provider | Start the active provider's login flow |
| Logout of active provider | Clear the active provider's session |
| Clear cache | Drop all in-memory resolved secrets |
| Save selection as secret | Write the selected text to a provider |
| Insert placeholder | Insert a placeholder via a location modal |
| Browse and insert placeholder | Fuzzy-pick an existing secret to insert |
| Browse and copy value | Fuzzy-pick a secret and copy its value |
| Copy secret under cursor | Copy the value of the placeholder at the cursor |
| Open placeholder index | Open the sidebar index view |

## Settings reference

**Display**

- **Mask mode** — `never` / `always` / `manual`.
- **Click action** / **Modifier-click action** — `copy` / `toggle-mask` /
  `none`.
- **Mask character** — the character used when masking.

**Providers**

- One enable/disable toggle per backend. A disabled provider contributes
  no settings, no status-bar chip, no placeholder rendering, no
  autocomplete.
- **Status bar** — choose which providers show a chip. Leave all
  unchecked to show every enabled provider.

**Per provider** — see [Provider setup](providers.md).
