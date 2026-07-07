// Reading-mode renderer.  Walks each rendered DOM block, finds placeholder
// text from any registered provider, and replaces each match with a span
// that resolves the value asynchronously.
//
// Strict invariant: this module NEVER mutates the underlying markdown file.
// It only manipulates the rendered DOM the post-processor was handed.

import { MarkdownPostProcessorContext } from "obsidian";
import type SecretPlaceholdersPlugin from "./main";
import { renderSecretSpan } from "./secretSpan";

export function buildPostProcessor(plugin: SecretPlaceholdersPlugin) {
  return (el: HTMLElement, _ctx: MarkdownPostProcessorContext): void => {
    const combined = plugin.registry.combinedRegex();
    // Use el's own document so nodes are created in the right window (popout compat).
    const doc = el.ownerDocument;
    // Walk text nodes only; we don't want to recurse into <pre>/<code>.
    const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest("pre, code")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const toProcess: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) toProcess.push(n as Text);

    for (const textNode of toProcess) {
      const text = textNode.nodeValue ?? "";
      combined.lastIndex = 0;
      if (!combined.test(text)) continue;
      combined.lastIndex = 0;

      const frag = createFragment();
      let lastIdx = 0;
      let m: RegExpExecArray | null;
      while ((m = combined.exec(text)) !== null) {
        if (m.index > lastIdx) {
          frag.appendChild(
            doc.createTextNode(text.slice(lastIdx, m.index)),
          );
        }
        const parsed = plugin.registry.parseRef(m[0]);
        if (parsed) {
          frag.appendChild(
            renderSecretSpan(plugin, parsed.provider, parsed.ref),
          );
        } else {
          frag.appendChild(doc.createTextNode(m[0]));
        }
        lastIdx = m.index + m[0].length;
      }
      if (lastIdx < text.length) {
        frag.appendChild(doc.createTextNode(text.slice(lastIdx)));
      }
      textNode.replaceWith(frag);
    }
  };
}
