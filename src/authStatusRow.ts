// Shared "login state + log in/out button" row that each provider renders
// at the top of its settings section.  Async-loads the current status,
// shows a clear ✓/✗ pill, and exposes a single state-appropriate button.
//
// The settings tab subscribes to provider.auth.onChange and re-displays so
// this row reflects logouts/logins without manual refresh.

import { Notice, setIcon } from "obsidian";
import { t } from "./i18n";
import type { Provider, ProviderAuthStatus } from "./providers/types";

export interface AuthStatusRowOptions {
  /** Extra buttons rendered next to Log in / Log out.  E.g. OpenBao's
   *  desktop "Paste token" alternative. */
  extraActions?: Array<{
    label: string;
    onClick: () => void | Promise<void>;
    /** Only render when current status.loggedIn === showWhen. */
    showWhen: "logged-in" | "logged-out" | "always";
  }>;
}

export function renderAuthStatusRow(
  containerEl: HTMLElement,
  provider: Provider,
  opts: AuthStatusRowOptions = {},
): void {
  const row = containerEl.createDiv({ cls: "sp-auth-row" });

  const left = row.createDiv({ cls: "sp-auth-row__left" });
  const pill = left.createSpan({ cls: "sp-auth-row__pill sp-auth-row__pill--loading" });
  const pillIcon = pill.createSpan({ cls: "sp-auth-row__pill-icon" });
  setIcon(pillIcon, "loader-2");
  pill.createSpan({ cls: "sp-auth-row__pill-text", text: t("auth.checking") });

  const detail = left.createDiv({ cls: "sp-auth-row__detail" });

  const right = row.createDiv({ cls: "sp-auth-row__right" });

  const setLoggedIn = (status: ProviderAuthStatus): void => {
    pill.removeClass("sp-auth-row__pill--loading");
    pill.removeClass("sp-auth-row__pill--out");
    pill.addClass("sp-auth-row__pill--in");
    pillIcon.empty();
    setIcon(pillIcon, "circle-check");
    pill.children[1]?.setText(t("auth.loggedIn"));
    detail.empty();
    const parts: string[] = [];
    if (status.identity) parts.push(status.identity);
    if (status.ttlSec !== undefined && status.ttlSec >= 0) {
      parts.push(t("auth.ttl", { ttl: formatTtl(status.ttlSec) }));
    }
    detail.setText(parts.join(" · "));
  };

  const setLoggedOut = (): void => {
    pill.removeClass("sp-auth-row__pill--loading");
    pill.removeClass("sp-auth-row__pill--in");
    pill.addClass("sp-auth-row__pill--out");
    pillIcon.empty();
    setIcon(pillIcon, "circle-x");
    pill.children[1]?.setText(t("auth.notLoggedIn"));
    detail.empty();
  };

  const renderActions = (loggedIn: boolean): void => {
    right.empty();
    const cls = "mod-cta";
    if (loggedIn) {
      const btn = right.createEl("button", { text: t("button.logOut") });
      btn.addClass("mod-warning");
      btn.addEventListener("click", async () => {
        await provider.auth.logout();
        new Notice(t("notice.loggedOut", { provider: provider.displayName }));
      });
    } else {
      const btn = right.createEl("button", { text: t("button.logIn") });
      btn.addClass(cls);
      btn.addEventListener("click", async () => {
        await provider.auth.login();
      });
    }
    for (const action of opts.extraActions ?? []) {
      const visible =
        action.showWhen === "always" ||
        (action.showWhen === "logged-in" && loggedIn) ||
        (action.showWhen === "logged-out" && !loggedIn);
      if (!visible) continue;
      const btn = right.createEl("button", { text: action.label });
      btn.addEventListener("click", () => void action.onClick());
    }
  };

  // Initial render: loading state with both buttons hidden until we know.
  // Resolve the status, then update.
  void (async () => {
    try {
      const status = await provider.auth.status();
      if (status.loggedIn) {
        setLoggedIn(status);
      } else {
        setLoggedOut();
      }
      renderActions(status.loggedIn);
    } catch {
      setLoggedOut();
      renderActions(false);
    }
  })();
}

function formatTtl(ttlSec: number): string {
  if (ttlSec <= 0) return "expired";
  if (ttlSec < 60) return `${ttlSec}s`;
  if (ttlSec < 3600) return `${Math.floor(ttlSec / 60)}m`;
  const h = Math.floor(ttlSec / 3600);
  const m = Math.floor((ttlSec % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
