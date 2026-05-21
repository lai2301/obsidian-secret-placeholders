// Editor commands.  The ONLY commands that may mutate the active note are
// the explicit "Insert placeholder" and "Save selection as secret" actions
// the user triggers from the palette.

import { MarkdownView, Notice } from "obsidian";

import type SecretPlaceholdersPlugin from "./main";
import { RefEditorModal } from "./modals";
import { SecretBrowserModal } from "./modals/secretBrowser";
import type { NoteContext, Provider } from "./providers/types";

function noteCtxFromView(view: MarkdownView | null): NoteContext {
  return {
    basename: view?.file?.basename ?? null,
    folder: view?.file?.parent?.path ?? null,
  };
}

/** v0.2 has a single provider, so "default provider" = the only one.  The
 *  abstraction is in place for Stage B/C to add a provider picker. */
function activeProvider(plugin: SecretPlaceholdersPlugin): Provider | null {
  return plugin.registry.defaultProvider() ?? null;
}

async function isProviderLoggedIn(provider: Provider): Promise<boolean> {
  return (await provider.auth.status()).loggedIn;
}

export function registerCommands(plugin: SecretPlaceholdersPlugin): void {
  plugin.addCommand({
    id: "secrets-login",
    name: "Secrets: Login to active provider",
    callback: async () => {
      const provider = activeProvider(plugin);
      if (!provider) return new Notice("No provider configured");
      await provider.auth.login();
    },
  });

  plugin.addCommand({
    id: "secrets-logout",
    name: "Secrets: Logout of active provider",
    callback: async () => {
      const provider = activeProvider(plugin);
      if (!provider) return;
      await provider.auth.logout();
      new Notice(`${provider.displayName}: logged out`);
    },
  });

  plugin.addCommand({
    id: "secrets-clear-cache",
    name: "Secrets: Clear cache",
    callback: () => {
      plugin.refreshSecretData();
      new Notice("Secret cache cleared");
    },
  });

  plugin.addCommand({
    id: "secrets-save-selection",
    name: "Secrets: Save selection as secret",
    editorCheckCallback: (checking, editor, view) => {
      const sel = editor.getSelection();
      if (!sel) return false;
      const provider = activeProvider(plugin);
      if (!provider) return false;
      if (checking) return true;

      void (async () => {
        if (!(await isProviderLoggedIn(provider))) {
          new Notice(`${provider.displayName}: log in first`);
          return;
        }
        const defaults = provider.suggestRefDefaults(
          noteCtxFromView(view as MarkdownView),
        );
        new RefEditorModal(
          plugin.app,
          provider,
          defaults,
          async (parts) => {
            if (!parts) return;
            try {
              const ref = {
                provider: provider.id,
                raw: provider.formatRef(parts),
                parts,
              };
              await provider.writeKey(ref, sel);
              editor.replaceSelection(ref.raw);
              plugin.refreshSecretData();
              new Notice(`Saved to ${ref.raw.slice(2, -2)}`);
            } catch (e) {
              new Notice(`Save failed: ${(e as Error).message}`);
            }
          },
        ).open();
      })();
    },
  });

  plugin.addCommand({
    id: "secrets-insert-placeholder",
    name: "Secrets: Insert placeholder",
    editorCheckCallback: (checking, editor, view) => {
      const provider = activeProvider(plugin);
      if (!provider) return false;
      if (checking) return true;

      void (async () => {
        if (!(await isProviderLoggedIn(provider))) {
          new Notice(`${provider.displayName}: log in first`);
          return;
        }
        const defaults = provider.suggestRefDefaults(
          noteCtxFromView(view as MarkdownView),
        );
        new RefEditorModal(plugin.app, provider, defaults, (parts) => {
          if (!parts) return;
          editor.replaceSelection(provider.formatRef(parts));
        }).open();
      })();
    },
  });

  plugin.addCommand({
    id: "secrets-browse-and-insert",
    name: "Secrets: Browse and insert placeholder",
    editorCheckCallback: (checking, editor) => {
      if (plugin.registry.all().length === 0) return false;
      if (checking) return true;
      new SecretBrowserModal(plugin.app, plugin, (entry) => {
        editor.replaceSelection(entry.ref.raw);
      }).open();
    },
  });

  plugin.addCommand({
    id: "secrets-browse-and-copy",
    name: "Secrets: Browse and copy value",
    callback: () => {
      if (plugin.registry.all().length === 0) return;
      new SecretBrowserModal(plugin.app, plugin, async (entry) => {
        try {
          const v = await entry.provider.readKey(entry.ref);
          await navigator.clipboard.writeText(v);
          new Notice("Secret copied to clipboard");
        } catch (e) {
          new Notice(`Read failed: ${(e as Error).message}`);
        }
      }).open();
    },
  });

  plugin.addCommand({
    id: "secrets-copy-under-cursor",
    name: "Secrets: Copy secret under cursor",
    editorCheckCallback: (checking, editor) => {
      const line = editor.getLine(editor.getCursor().line);
      const combined = plugin.registry.combinedRegex();
      if (!combined.test(line)) return false;
      if (checking) return true;

      const cursor = editor.getCursor();
      combined.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = combined.exec(line)) !== null) {
        if (m.index <= cursor.ch && cursor.ch <= m.index + m[0].length) {
          const parsed = plugin.registry.parseRef(m[0]);
          if (!parsed) return;
          void (async () => {
            try {
              const v = await parsed.provider.readKey(parsed.ref);
              await navigator.clipboard.writeText(v);
              new Notice("Secret copied to clipboard");
            } catch (e) {
              new Notice(`Read failed: ${(e as Error).message}`);
            }
          })();
          return;
        }
      }
      new Notice("No placeholder under cursor");
    },
  });
}
