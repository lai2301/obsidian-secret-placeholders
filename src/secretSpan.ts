// Shared masked-secret <span> used by both the reading-mode post-processor
// and the live-preview widget.  Behavior is driven by global plugin settings
// (maskMode, clickAction, modifierClickAction) and by the provider's auth
// state for error recovery.
//
// Display-only - never writes back to the document.

import { Notice, setIcon } from "obsidian";
import { t } from "./i18n";
import { attachSpanContextMenu } from "./contextMenu";
import type SecretPlaceholdersPlugin from "./main";
import type { Provider, ProviderRef } from "./providers/types";
import { ClickAction, MaskMode } from "./settings";

type Phase = "loading" | "ready" | "error";

interface SpanState {
  phase: Phase;
  value: string | null;
  errorMessage: string | null;
  revealed: boolean;
  /** Generation counter so a stale in-flight load() can detect that it
   *  was superseded (e.g. logout fired a new load mid-fetch). */
  loadGen: number;
}

export function renderSecretSpan(
  plugin: SecretPlaceholdersPlugin,
  provider: Provider,
  ref: ProviderRef,
): HTMLElement {
  const span = activeDocument.createSpan();
  span.className = "sp-secret";
  span.dataset.provider = provider.id;
  span.dataset.raw = ref.raw;
  span.title = ref.raw.slice(2, -2); // strip {{...}}

  const state: SpanState = {
    phase: "loading",
    value: null,
    errorMessage: null,
    revealed: false,
    loadGen: 0,
  };

  const render = () => {
    span.empty();
    span.classList.remove(
      "sp-secret--loading",
      "sp-secret--error",
      "sp-secret--masked",
      "sp-secret--revealed",
    );

    if (state.phase === "loading") {
      span.classList.add("sp-secret--loading");
      const s = span.createSpan({ cls: "sp-secret__spinner" });
      setIcon(s, "loader-2");
      return;
    }

    if (state.phase === "error") {
      span.classList.add("sp-secret--error");
      span.title = state.errorMessage ?? "error";
      const label = span.createSpan({ cls: "sp-secret__label" });
      label.textContent = "[secret: error]";

      // Offer an inline Re-login button if the provider is logged out.
      void provider.auth.status().then((status) => {
        // Bail out if the span has since transitioned away from error
        // (e.g. another load() resolved successfully).
        if (state.phase !== "error") return;
        if (status.loggedIn) return;
        // De-dup the button - render() empties the span, so if the
        // status promise resolved fast we'd never end up with duplicates.
        if (span.querySelector(".sp-secret__relogin")) return;

        const btn = span.createSpan({ cls: "sp-secret__relogin" });
        btn.textContent = t("span.reLogin");
        btn.setAttr("role", "button");
        btn.addEventListener(
          "mousedown",
          (e) => {
            e.stopImmediatePropagation();
            e.preventDefault();
          },
          true,
        );
        btn.addEventListener("click", (e) => {
          e.stopImmediatePropagation();
          e.preventDefault();
          void (async () => {
            await provider.auth.login();
            void load();
          })();
        });
      });
      return;
    }

    // phase === "ready"
    span.title = ref.raw.slice(2, -2);
    const masked = shouldMask(plugin.settings.maskMode, state.revealed);
    span.classList.add(masked ? "sp-secret--masked" : "sp-secret--revealed");
    span.textContent = masked
      ? plugin.settings.maskCharacter.repeat(
          Math.max(4, state.value?.length ?? 4),
        )
      : (state.value ?? "");
  };

  const load = async (): Promise<void> => {
    const gen = ++state.loadGen;
    state.phase = "loading";
    state.value = null;
    state.errorMessage = null;
    render();
    try {
      const v = await provider.readKey(ref);
      if (gen !== state.loadGen) return; // superseded
      state.phase = "ready";
      state.value = v;
      render();
    } catch (e) {
      if (gen !== state.loadGen) return; // superseded
      state.phase = "error";
      state.value = null;
      state.errorMessage = (e as Error)?.message ?? String(e);
      render();
    }
  };

  void load();

  // React to plugin-wide state changes (auth, settings).  The plugin
  // dispatches `sp-state-change` directly on each .sp-secret element via
  // querySelectorAll, so this listener is naturally GC'd when the span
  // detaches from the DOM.
  //
  // On auth changes (login OR logout) we always re-fetch so logout
  // correctly transitions a previously-resolved span back to error.
  // On settings changes we just re-render with current state.
  span.addEventListener("sp-state-change", (ev) => {
    const detail = (ev as CustomEvent<{ reason?: string }>).detail;
    if (detail?.reason === "auth") {
      void load();
    } else {
      render();
    }
  });

  attachSpanContextMenu(span, plugin, provider, ref);

  span.addEventListener("click", (e) => {
    // Ignore clicks that originated inside the re-login button.
    const target = e.target as HTMLElement | null;
    if (target && target.closest(".sp-secret__relogin")) return;

    e.preventDefault();
    e.stopPropagation();
    // Only resolved values are clickable.  In loading and error states
    // a click is a no-op (we don't want toggle-mask to flicker into a
    // spinner that never resolves).
    if (state.phase !== "ready" || state.value === null) return;
    const action: ClickAction =
      e.ctrlKey || e.metaKey
        ? plugin.settings.modifierClickAction
        : plugin.settings.clickAction;
    applyAction(action, state, render);
  });

  return span;
}

function shouldMask(mode: MaskMode, revealed: boolean): boolean {
  switch (mode) {
    case "never":
      return false;
    case "always":
      return true;
    case "manual":
      return !revealed;
  }
}

function applyAction(
  action: ClickAction,
  state: SpanState,
  rerender: () => void,
): void {
  switch (action) {
    case "copy": {
      if (state.value === null) return;
      void navigator.clipboard
        .writeText(state.value)
        .then(() => new Notice(t("notice.secretCopied")))
        .catch(() => new Notice(t("span.copyFailed")));
      return;
    }
    case "toggle-mask":
      state.revealed = !state.revealed;
      rerender();
      return;
    case "none":
      return;
  }
}
