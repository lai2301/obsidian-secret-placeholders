// CodeMirror 6 decoration that replaces `{{<provider>:...}}` placeholders
// from any registered provider with the masked secret widget in Live Preview.
//
// Strict invariant: this never edits the document.  It only renders a
// Decoration.replace WidgetType.  The original placeholder text re-appears
// automatically when the user's selection enters the range (standard
// Obsidian "hide markup unless caret is on it" behavior).

import {
  Decoration,
  DecorationSet,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { editorLivePreviewField } from "obsidian";

import type SecretPlaceholdersPlugin from "./main";
import type { Provider, ProviderRef } from "./providers/types";
import { renderSecretSpan } from "./secretSpan";

class SecretWidget extends WidgetType {
  constructor(
    private plugin: SecretPlaceholdersPlugin,
    private provider: Provider,
    private ref: ProviderRef,
  ) {
    super();
  }
  eq(other: SecretWidget): boolean {
    return (
      other.ref.raw === this.ref.raw &&
      other.provider.id === this.provider.id
    );
  }
  toDOM(): HTMLElement {
    return renderSecretSpan(this.plugin, this.provider, this.ref);
  }
  ignoreEvent(event: Event): boolean {
    // Returning true here tells CodeMirror to leave the event alone - it
    // won't move the cursor into the placeholder range on click, which would
    // otherwise hide the widget and re-expose the raw {{bao:...}} text
    // (which looks identical to "click unmasked it").  We still receive the
    // event via the normal DOM bubble, so our span listener (copy / toggle-
    // mask) runs as expected.
    if (event.type === "click" || event.type === "mousedown") return true;
    return false;
  }
}

export function buildLivePreviewExtension(
  plugin: SecretPlaceholdersPlugin,
) {
  const decorator = new MatchDecorator({
    regexp: plugin.registry.combinedRegex(),
    decoration: (match) => {
      const parsed = plugin.registry.parseRef(match[0]);
      if (!parsed) return Decoration.mark({});
      return Decoration.replace({
        widget: new SecretWidget(plugin, parsed.provider, parsed.ref),
      });
    },
  });

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = this.compute(view);
      }
      update(u: ViewUpdate): void {
        if (u.docChanged || u.viewportChanged || u.selectionSet) {
          this.decorations = this.compute(u.view);
        }
      }
      compute(view: EditorView): DecorationSet {
        if (!view.state.field(editorLivePreviewField, false)) {
          return Decoration.none;
        }
        const sel = view.state.selection.main;
        const base = decorator.createDeco(view);
        const builder = new RangeSetBuilder<Decoration>();
        const iter = base.iter();
        while (iter.value) {
          const overlaps = sel.from <= iter.to && sel.to >= iter.from;
          if (!overlaps) builder.add(iter.from, iter.to, iter.value);
          iter.next();
        }
        return builder.finish();
      }
    },
    { decorations: (v) => v.decorations },
  );
}
