// EditorSuggest with three trigger modes:
//
//   1. `{{` alone               -> list of enabled providers (prefix picker)
//   2. `{{<text>` (no colon)    -> cross-provider fuzzy search across every
//                                  provider's list(), plus any providers
//                                  whose prefix starts with <text>
//   3. `{{<prefix>:<query>`     -> per-provider list (existing behaviour)
//
// Each provider's list() result is cached for 60s to avoid hitting the
// backend on every keystroke.

import {
  App,
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  TFile,
} from "obsidian";

import type SecretPlaceholdersPlugin from "./main";
import type { Provider, ProviderRef } from "./providers/types";

const CACHE_TTL_MS = 60_000;

interface ProviderCache {
  fetchedAt: number;
  refs: ProviderRef[];
}

type Suggestion =
  | { kind: "provider"; provider: Provider; label: string }
  | { kind: "ref"; provider: Provider; ref: ProviderRef; label: string };

export class SecretEditorSuggest extends EditorSuggest<Suggestion> {
  private caches = new Map<string, ProviderCache>();
  private inflight = new Map<string, Promise<ProviderRef[]>>();

  constructor(
    app: App,
    private plugin: SecretPlaceholdersPlugin,
  ) {
    super(app);
  }

  onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    _file: TFile | null,
  ): EditorSuggestTriggerInfo | null {
    const line = editor.getLine(cursor.line);
    const upToCursor = line.slice(0, cursor.ch);
    const open = upToCursor.lastIndexOf("{{");
    if (open === -1) return null;
    const between = upToCursor.slice(open + 2);
    // Bail if the placeholder is already closed.
    if (between.includes("}}")) return null;
    // Bail if the user has typed anything wildly off (newline etc.).
    if (between.includes("\n")) return null;

    return {
      start: { line: cursor.line, ch: open },
      end: cursor,
      query: between, // e.g. "", "bao", "bao:kv/obs", or "github"
    };
  }

  async getSuggestions(ctx: EditorSuggestContext): Promise<Suggestion[]> {
    const query = ctx.query;
    const colon = query.indexOf(":");
    if (colon >= 0) {
      // Mode 3: per-provider list (existing behaviour).
      const prefixWithColon = `${query.slice(0, colon)}:`;
      const provider = this.providerByPrefix(prefixWithColon);
      if (!provider) return [];
      const refs = await this.getRefs(provider);
      const filter = query.slice(colon + 1).toLowerCase();
      const matches = filter
        ? refs.filter((r) => r.raw.toLowerCase().includes(filter))
        : refs;
      return matches.slice(0, 50).map((ref) => ({
        kind: "ref" as const,
        provider,
        ref,
        label: ref.raw.slice(2, -2),
      }));
    }

    // Mode 1 + 2: no colon yet.  Show providers that match the typed text
    // first, then cross-provider fuzzy matches against every secret name.
    const providers = this.plugin.registry.all();
    const filter = query.toLowerCase();
    const out: Suggestion[] = [];

    // Provider picks first (they're cheap and definitive).
    for (const p of providers) {
      const prefixWithoutColon = p.placeholderPrefix.replace(/:$/, "");
      if (!filter || prefixWithoutColon.startsWith(filter)) {
        out.push({
          kind: "provider",
          provider: p,
          label: `${p.placeholderPrefix} — ${p.displayName}`,
        });
      }
    }

    // Cross-provider unified fuzzy search.  Only fire when the user has
    // typed something - typing `{{` alone shows the provider list above.
    if (filter) {
      const seen = new Set<string>();
      for (const p of providers) {
        let refs: ProviderRef[];
        try {
          refs = await this.getRefs(p);
        } catch {
          continue;
        }
        for (const ref of refs) {
          const label = ref.raw.slice(2, -2);
          if (!label.toLowerCase().includes(filter)) continue;
          // De-duplicate refs that share the same raw text across providers
          // (unlikely but defensive).
          const key = `${p.id}:${ref.raw}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ kind: "ref", provider: p, ref, label });
          if (out.length >= 50) break;
        }
        if (out.length >= 50) break;
      }
    }

    return out;
  }

  renderSuggestion(s: Suggestion, el: HTMLElement): void {
    el.addClass("sp-suggest");
    el.createDiv({ cls: "sp-suggest__primary", text: s.label });
    el.createDiv({
      cls: "sp-suggest__secondary",
      text:
        s.kind === "provider"
          ? "Provider"
          : s.provider.displayName,
    });
  }

  selectSuggestion(s: Suggestion): void {
    if (!this.context) return;
    const { editor, start, end } = this.context;
    if (s.kind === "provider") {
      // Insert `{{<prefix>:` and let the user keep typing - the next
      // keystroke re-triggers this suggester in mode 3.
      const inserted = `{{${s.provider.placeholderPrefix}`;
      editor.replaceRange(inserted, start, end);
      // Move the cursor to the end of the inserted text so the suggester
      // wakes up again.
      editor.setCursor({
        line: start.line,
        ch: start.ch + inserted.length,
      });
    } else {
      editor.replaceRange(s.ref.raw, start, end);
    }
  }

  private providerByPrefix(prefixWithColon: string): Provider | null {
    for (const p of this.plugin.registry.all()) {
      if (p.placeholderPrefix === prefixWithColon) return p;
    }
    return null;
  }

  private async getRefs(provider: Provider): Promise<ProviderRef[]> {
    const cached = this.caches.get(provider.id);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.refs;
    }
    const existing = this.inflight.get(provider.id);
    if (existing) return existing;

    const p = (async () => {
      try {
        const refs = await provider.list();
        this.caches.set(provider.id, { fetchedAt: Date.now(), refs });
        return refs;
      } catch {
        return [];
      }
    })();
    this.inflight.set(provider.id, p);
    try {
      return await p;
    } finally {
      this.inflight.delete(provider.id);
    }
  }
}
