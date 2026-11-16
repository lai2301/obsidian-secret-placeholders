// Right-click (editor-menu) actions:
//
//   - On a non-empty selection: one "Save selection to <provider>" item
//     per registered provider, so multi-provider users can pick which
//     backend the secret should land in.
//
//   - On cursor inside a `{{<prefix>:...}}` placeholder (Source mode):
//     "Copy resolved value" and "Replace with resolved value…".  Live
//     Preview and Reading mode get the same actions via a span-level
//     DOM contextmenu handler attached when each `.sp-secret` is built;
//     that's more reliable than cursor-based detection because clicking
//     the widget itself is enough to identify the placeholder.

import {
  Editor,
  EditorPosition,
  MarkdownView,
  Menu,
  Modal,
  Notice,
  Setting,
  TFile,
} from "obsidian";

import { t } from "./i18n";
import type SecretPlaceholdersPlugin from "./main";
import { RefEditorModal } from "./modals";
import { openEditSecretModal } from "./modals/editSecret";
import type { NoteContext, Provider, ProviderRef } from "./providers/types";

interface PlaceholderHit {
  provider: Provider;
  ref: ProviderRef;
  /** Start char in the line (only set for editor-menu path).  Null when
   *  hit came from a span DOM event where we don't have line info up
   *  front. */
  startCh: number | null;
  endCh: number | null;
}

function findPlaceholderAtCursor(
  plugin: SecretPlaceholdersPlugin,
  editor: Editor,
  cursor: EditorPosition,
): PlaceholderHit | null {
  const line = editor.getLine(cursor.line);
  const combined = plugin.registry.combinedRegex();
  combined.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = combined.exec(line)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    if (cursor.ch >= start && cursor.ch <= end) {
      const parsed = plugin.registry.parseRef(m[0]);
      if (!parsed) return null;
      return {
        provider: parsed.provider,
        ref: parsed.ref,
        startCh: start,
        endCh: end,
      };
    }
  }
  return null;
}

function noteCtxFromView(view: MarkdownView | null): NoteContext {
  return {
    basename: view?.file?.basename ?? null,
    folder: view?.file?.parent?.path ?? null,
  };
}

export function registerEditorContextMenu(
  plugin: SecretPlaceholdersPlugin,
): void {
  plugin.registerEvent(
    plugin.app.workspace.on("editor-menu", (menu, editor, view) => {
      const mdView = view as MarkdownView;
      const selection = editor.getSelection();
      const cursor = editor.getCursor();
      const hit = findPlaceholderAtCursor(plugin, editor, cursor);

      if (selection) {
        for (const provider of plugin.registry.all()) {
          menu.addItem((item) => {
            item
              .setTitle(t("contextMenu.saveSelectionTo", { provider: provider.displayName }))
              .setIcon("key")
              .onClick(() => {
                void saveSelectionAsSecret(
                  plugin,
                  editor,
                  mdView,
                  selection,
                  provider,
                );
              });
          });
        }
      }

      if (hit) {
        menu.addItem((item) => {
          item
            .setTitle(t("contextMenu.copyResolvedValue"))
            .setIcon("clipboard-copy")
            .onClick(() => {
              void copyResolved(hit);
            });
        });
        menu.addItem((item) => {
          item
            .setTitle(t("contextMenu.editSecretValue"))
            .setIcon("pencil")
            .onClick(() => {
              openEditSecretModal(plugin, hit.provider, hit.ref);
            });
        });
        menu.addItem((item) => {
          item
            .setTitle(t("contextMenu.replaceWithResolved"))
            .setIcon("alert-triangle")
            .onClick(() => {
              void replaceInEditor(plugin, editor, cursor, hit);
            });
        });
      }
    }),
  );
}

/** Attach a DOM-level contextmenu handler to a rendered placeholder span
 *  so right-click on the widget itself shows Copy / Replace in Live
 *  Preview, Reading mode, and Source.  This is more reliable than the
 *  editor-menu path because it doesn't depend on CodeMirror's cursor
 *  placement when right-clicking on a widget. */
export function attachSpanContextMenu(
  span: HTMLElement,
  plugin: SecretPlaceholdersPlugin,
  provider: Provider,
  ref: ProviderRef,
): void {
  span.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const menu = new Menu();
    menu.addItem((item) =>
      item
        .setTitle(t("contextMenu.copyResolvedValue"))
        .setIcon("clipboard-copy")
        .onClick(() => {
          void copyResolved({
            provider,
            ref,
            startCh: null,
            endCh: null,
          });
        }),
    );
    menu.addItem((item) =>
      item
        .setTitle(t("contextMenu.editSecretValue"))
        .setIcon("pencil")
        .onClick(() => {
          openEditSecretModal(plugin, provider, ref);
        }),
    );
    menu.addItem((item) =>
      item
        .setTitle(t("contextMenu.replaceWithResolved"))
        .setIcon("alert-triangle")
        .onClick(() => {
          void replaceInActiveFile(plugin, provider, ref);
        }),
    );
    menu.showAtMouseEvent(e);
  });
}

async function saveSelectionAsSecret(
  plugin: SecretPlaceholdersPlugin,
  editor: Editor,
  view: MarkdownView | null,
  selection: string,
  provider: Provider,
): Promise<void> {
  const status = await provider.auth.status();
  if (!status.loggedIn) {
    new Notice(t("notice.logInFirst", { provider: provider.displayName }));
    return;
  }
  const defaults = provider.suggestRefDefaults(noteCtxFromView(view));
  new RefEditorModal(plugin.app, provider, defaults, async (parts) => {
    if (!parts) return;
    try {
      const ref = {
        provider: provider.id,
        raw: provider.formatRef(parts),
        parts,
      };
      await provider.writeKey(ref, selection);
      editor.replaceSelection(ref.raw);
      plugin.refreshSecretData();
      new Notice(t("notice.savedTo", { ref: ref.raw.slice(2, -2) }));
    } catch (e) {
      new Notice(t("notice.saveFailed", { msg: (e as Error).message }));
    }
  }).open();
}

async function copyResolved(hit: PlaceholderHit): Promise<void> {
  try {
    const value = await hit.provider.readKey(hit.ref);
    await navigator.clipboard.writeText(value);
    new Notice(t("notice.secretCopied"));
  } catch (e) {
    new Notice(t("notice.readFailed", { msg: (e as Error).message }));
  }
}

/** Replace using the editor we already have (editor-menu path). */
async function replaceInEditor(
  plugin: SecretPlaceholdersPlugin,
  editor: Editor,
  cursor: EditorPosition,
  hit: PlaceholderHit,
): Promise<void> {
  if (hit.startCh === null || hit.endCh === null) {
    await replaceInActiveFile(plugin, hit.provider, hit.ref);
    return;
  }
  let value: string;
  try {
    value = await hit.provider.readKey(hit.ref);
  } catch (e) {
    new Notice(t("notice.readFailed", { msg: (e as Error).message }));
    return;
  }
  if (!(await confirmReplace(plugin, hit.ref, value))) return;
  editor.replaceRange(
    value,
    { line: cursor.line, ch: hit.startCh },
    { line: cursor.line, ch: hit.endCh },
  );
}

/** Replace the FIRST occurrence of the placeholder in the active file
 *  via vault.process.  Used by the span-level contextmenu handler where
 *  we don't have a guaranteed editor/cursor pair (Reading mode, or when
 *  the widget was right-clicked outside the editor's cursor model). */
async function replaceInActiveFile(
  plugin: SecretPlaceholdersPlugin,
  provider: Provider,
  ref: ProviderRef,
): Promise<void> {
  const file = plugin.app.workspace.getActiveFile();
  if (!(file instanceof TFile)) {
    new Notice(t("contextMenu.noActiveFile"));
    return;
  }
  let value: string;
  try {
    value = await provider.readKey(ref);
  } catch (e) {
    new Notice(t("notice.readFailed", { msg: (e as Error).message }));
    return;
  }
  if (!(await confirmReplace(plugin, ref, value))) return;

  await plugin.app.vault.process(file, (content) => {
    const idx = content.indexOf(ref.raw);
    if (idx < 0) return content;
    return content.slice(0, idx) + value + content.slice(idx + ref.raw.length);
  });
  new Notice(t("contextMenu.placeholderReplaced"));
}

function confirmReplace(
  plugin: SecretPlaceholdersPlugin,
  ref: ProviderRef,
  value: string,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    new ConfirmReplaceModal(plugin, ref, value, resolve).open();
  });
}

class ConfirmReplaceModal extends Modal {
  constructor(
    private plugin: SecretPlaceholdersPlugin,
    private ref: ProviderRef,
    private value: string,
    private onResult: (confirmed: boolean) => void,
  ) {
    super(plugin.app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: t("contextMenu.confirmReplace.title") });

    const masked = "•".repeat(Math.min(this.value.length, 12));
    const preview =
      this.value.length <= 4
        ? masked
        : `${this.value.slice(0, 2)}${masked}${this.value.slice(-2)}`;

    contentEl.createEl("p", {
      text: t("contextMenu.confirmReplace.body", { preview }),
    });
    contentEl.createEl("p", {
      cls: "setting-item-description",
      text: t("contextMenu.confirmReplace.placeholder", { ref: this.ref.raw }),
    });

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText(t("contextMenu.confirmReplace.replaceInline"))
          .setWarning()
          .onClick(() => {
            this.onResult(true);
            this.close();
          }),
      )
      .addButton((b) =>
        b
          .setButtonText(t("button.cancel"))
          .setCta()
          .onClick(() => {
            this.onResult(false);
            this.close();
          }),
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
