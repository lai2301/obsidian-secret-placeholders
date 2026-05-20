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
    // Walk text nodes only; we don't want to recurse into <pre>/<code>.
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
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

      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      let m: RegExpExecArray | null;
      while ((m = combined.exec(text)) !== null) {
        if (m.index > lastIdx) {
          frag.appendChild(
            document.createTextNode(text.slice(lastIdx, m.index)),
          );
        }
        const parsed = plugin.registry.parseRef(m[0]);
        if (parsed) {
          frag.appendChild(
            renderSecretSpan(plugin, parsed.provider, parsed.ref),
          );
        } else {
          frag.appendChild(document.createTextNode(m[0]));
        }
        lastIdx = m.index + m[0].length;
      }
      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      }
      textNode.replaceWith(frag);
    }
  };
}
