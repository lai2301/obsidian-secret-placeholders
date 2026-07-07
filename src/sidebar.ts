// Sidebar view that indexes every {{<prefix>:...}} placeholder in the vault
// and lets the user jump to each usage site.  Scoped to a read-only audit
// tool for v0.5; bulk operations come in v0.6+.

import { ItemView, MarkdownView, Notice, TFile, WorkspaceLeaf, debounce, setIcon } from "obsidian";

import { t } from "./i18n";
import type SecretPlaceholdersPlugin from "./main";
import { openEditSecretModal } from "./modals/editSecret";

export const VIEW_TYPE_INDEX = "secret-placeholders-index";

interface UsageSite {
  file: TFile;
  line: number;
  col: number;
}

interface RefEntry {
  raw: string;
  providerId: string;
  uses: UsageSite[];
}

interface ProviderGroup {
  providerId: string;
  displayName: string;
  refs: Map<string, RefEntry>;
}

export class SecretIndexView extends ItemView {
  private filterText = "";
  private index: Map<string, ProviderGroup> = new Map();
  private indexing = false;
  private debouncedRebuild: (file?: TFile) => void;

  constructor(
    leaf: WorkspaceLeaf,
    private plugin: SecretPlaceholdersPlugin,
  ) {
    super(leaf);
    this.debouncedRebuild = debounce(
      (file?: TFile) => void this.rebuild(file),
      400,
      true,
    );
  }

  getViewType(): string {
    return VIEW_TYPE_INDEX;
  }

  getDisplayText(): string {
    return t("sidebar.displayName");
  }

  getIcon(): string {
    return "key-round";
  }

  async onOpen(): Promise<void> {
    // Re-index when the vault changes.  The debounce makes multi-file
    // edits (e.g. a global rename) only trigger one rebuild.
    this.registerEvent(
      this.app.vault.on("modify", (f) => {
        if (f instanceof TFile && f.extension === "md") {
          this.debouncedRebuild(f);
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("create", (f) => {
        if (f instanceof TFile && f.extension === "md") this.debouncedRebuild();
      }),
    );
    this.registerEvent(
      this.app.vault.on("delete", () => this.debouncedRebuild()),
    );
    this.registerEvent(
      this.app.vault.on("rename", () => this.debouncedRebuild()),
    );

    await this.rebuild();
  }

  async rebuild(_changed?: TFile): Promise<void> {
    if (this.indexing) return;
    this.indexing = true;
    try {
      const combined = this.plugin.registry.combinedRegex();
      const out = new Map<string, ProviderGroup>();
      for (const file of this.app.vault.getMarkdownFiles()) {
        let content: string;
        try {
          content = await this.app.vault.cachedRead(file);
        } catch {
          continue;
        }
        // Per-line scan so we can record line + column without recomputing.
        const lines = content.split("\n");
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
          const line = lines[lineIdx];
          combined.lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = combined.exec(line)) !== null) {
            const parsed = this.plugin.registry.parseRef(m[0]);
            if (!parsed) continue;
            const providerId = parsed.provider.id;
            let group = out.get(providerId);
            if (!group) {
              group = {
                providerId,
                displayName: parsed.provider.displayName,
                refs: new Map(),
              };
              out.set(providerId, group);
            }
            let entry = group.refs.get(parsed.ref.raw);
            if (!entry) {
              entry = { raw: parsed.ref.raw, providerId, uses: [] };
              group.refs.set(parsed.ref.raw, entry);
            }
            entry.uses.push({ file, line: lineIdx, col: m.index });
          }
        }
      }
      this.index = out;
      this.render();
    } finally {
      this.indexing = false;
    }
  }

  private render(): void {
    const root = this.contentEl;
    root.empty();
    root.addClass("sp-sidebar");

    const header = root.createDiv({ cls: "sp-sidebar__header" });
    const title = header.createDiv({ cls: "sp-sidebar__title" });
    title.setText(t("sidebar.title"));
    const totalRefs = [...this.index.values()].reduce(
      (a, g) => a + g.refs.size,
      0,
    );
    const totalUses = [...this.index.values()].reduce(
      (a, g) =>
        a +
        [...g.refs.values()].reduce((aa, r) => aa + r.uses.length, 0),
      0,
    );
    title.createSpan({
      cls: "sp-sidebar__count",
      text: t("sidebar.count", { refs: totalRefs, uses: totalUses }),
    });
    const refreshBtn = header.createEl("button", { cls: "sp-sidebar__refresh" });
    setIcon(refreshBtn, "refresh-ccw");
    refreshBtn.setAttr("aria-label", t("sidebar.rescan"));
    refreshBtn.addEventListener("click", () => void this.rebuild());

    const filter = root.createEl("input", {
      type: "text",
      cls: "sp-sidebar__filter",
      placeholder: t("sidebar.filter"),
    });
    filter.value = this.filterText;
    filter.addEventListener("input", () => {
      this.filterText = filter.value;
      this.renderTree(treeContainer);
    });

    const treeContainer = root.createDiv({ cls: "sp-sidebar__tree" });
    this.renderTree(treeContainer);
  }

  private renderTree(container: HTMLElement): void {
    container.empty();
    if (this.index.size === 0) {
      container.createDiv({
        cls: "sp-sidebar__empty",
        text: t("sidebar.empty"),
      });
      return;
    }
    const filter = this.filterText.toLowerCase();
    for (const group of this.index.values()) {
      const matchingRefs = [...group.refs.values()].filter(
        (r) => !filter || r.raw.toLowerCase().includes(filter),
      );
      if (matchingRefs.length === 0) continue;
      const totalUses = matchingRefs.reduce((a, r) => a + r.uses.length, 0);
      const providerEl = container.createDiv({ cls: "sp-sidebar__group" });
      providerEl.createDiv({
        cls: "sp-sidebar__group-header",
        text: t("sidebar.groupHeader", {
          provider: group.displayName,
          refs: matchingRefs.length,
          uses: totalUses,
        }),
      });
      for (const ref of matchingRefs.sort((a, b) =>
        a.raw.localeCompare(b.raw),
      )) {
        const refEl = providerEl.createDiv({ cls: "sp-sidebar__ref" });
        const titleRow = refEl.createDiv({ cls: "sp-sidebar__ref-row" });
        titleRow.createDiv({
          cls: "sp-sidebar__ref-title",
          text: ref.raw.slice(2, -2),
        });
        const actions = titleRow.createDiv({ cls: "sp-sidebar__ref-actions" });
        const editBtn = actions.createEl("button", {
          cls: "sp-sidebar__action",
          attr: { "aria-label": t("sidebar.editSecret") },
        });
        setIcon(editBtn, "pencil");
        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const provider = this.plugin.registry.get(ref.providerId);
          if (!provider) {
            new Notice(t("sidebar.providerNotEnabled", { provider: ref.providerId }));
            return;
          }
          const parsed = this.plugin.registry.parseRef(ref.raw);
          if (!parsed) {
            new Notice(t("sidebar.parseError"));
            return;
          }
          openEditSecretModal(this.plugin, parsed.provider, parsed.ref);
        });

        const usesEl = refEl.createDiv({ cls: "sp-sidebar__uses" });
        for (const use of ref.uses) {
          const useEl = usesEl.createDiv({ cls: "sp-sidebar__use" });
          useEl.setText(`${use.file.path}:${use.line + 1}`);
          useEl.addEventListener("click", () => void this.openAt(use));
        }
      }
    }
  }

  private async openAt(use: UsageSite): Promise<void> {
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(use.file);
    const view = leaf.view;
    if (view instanceof MarkdownView) {
      const editor = view.editor;
      editor.setCursor({ line: use.line, ch: use.col });
      editor.scrollIntoView(
        { from: { line: use.line, ch: 0 }, to: { line: use.line, ch: 0 } },
        true,
      );
    }
  }
}

export async function activateSecretIndexView(
  plugin: SecretPlaceholdersPlugin,
): Promise<void> {
  const { workspace } = plugin.app;
  let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(VIEW_TYPE_INDEX)[0] ?? null;
  if (!leaf) {
    leaf = workspace.getRightLeaf(false);
    if (!leaf) {
      new Notice(t("sidebar.openFailed"));
      return;
    }
    await leaf.setViewState({ type: VIEW_TYPE_INDEX, active: true });
  }
  void workspace.revealLeaf(leaf);
}
