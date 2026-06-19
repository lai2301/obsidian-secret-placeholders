// Fuzzy-search across known secrets from every enabled provider.  Used by
// the "Browse and insert" / "Browse and copy" commands so the user doesn't
// have to remember exact paths.

import { App, FuzzySuggestModal } from "obsidian";
import { t } from "../i18n";
import type SecretPlaceholdersPlugin from "../main";
import type { Provider, ProviderRef } from "../providers/types";

interface Entry {
  provider: Provider;
  ref: ProviderRef;
}

export class SecretBrowserModal extends FuzzySuggestModal<Entry> {
  private entries: Entry[] = [];

  constructor(
    app: App,
    private plugin: SecretPlaceholdersPlugin,
    private onChoose: (entry: Entry) => void,
  ) {
    super(app);
    this.setPlaceholder(t("modal.secretBrowser.searchPlaceholder"));
  }

  onOpen(): void {
    super.onOpen();
    void this.load();
  }

  private async load(): Promise<void> {
    const out: Entry[] = [];
    for (const provider of this.plugin.registry.all()) {
      try {
        const refs = await provider.list();
        for (const ref of refs) out.push({ provider, ref });
      } catch {
        /* skip providers that fail to list */
      }
    }
    this.entries = out;
    // FuzzySuggestModal doesn't auto-refresh on data change, so simulate
    // an input event to force a re-query.
    this.inputEl.dispatchEvent(new Event("input"));
  }

  getItems(): Entry[] {
    return this.entries;
  }

  getItemText(item: Entry): string {
    return `${item.ref.raw.slice(2, -2)}  (${item.provider.displayName})`;
  }

  onChooseItem(item: Entry): void {
    this.onChoose(item);
  }
}
