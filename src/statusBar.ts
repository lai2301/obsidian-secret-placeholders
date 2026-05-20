// Status-bar item that tracks each enabled provider's login state and
// ticks down the remaining token TTL.  Each chip is independently
// clickable - clicking the OpenBao chip toggles OpenBao login, clicking
// the 1P chip toggles 1P login, etc.
//
// Which providers are visible is controlled by settings.statusBarProviders:
//   - empty array (default) => every enabled provider gets a chip
//   - non-empty             => only providers in the list are shown

import { setIcon } from "obsidian";
import type SecretPlaceholdersPlugin from "./main";
import type { Provider, ProviderAuthStatus } from "./providers/types";

interface ProviderStatusEntry {
  provider: Provider;
  status: ProviderAuthStatus;
  /** Wall-clock time at which the current ttlSec was captured. */
  capturedAt: number;
}

export class StatusBar {
  private el: HTMLElement;
  private entries = new Map<string, ProviderStatusEntry>();
  private timer: number | null = null;
  private unsubscribes: Array<() => void> = [];

  constructor(private plugin: SecretPlaceholdersPlugin) {
    this.el = plugin.addStatusBarItem();
    this.el.addClass("sp-status");
    this.setup();
  }

  destroy(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    for (const u of this.unsubscribes) u();
    this.unsubscribes = [];
    this.el.remove();
  }

  private visibleProviders(): Provider[] {
    const allowList = this.plugin.settings.statusBarProviders;
    const all = this.plugin.registry.all();
    if (!allowList.length) return all;
    return all.filter((p) => allowList.includes(p.id));
  }

  private setup(): void {
    for (const provider of this.visibleProviders()) {
      this.entries.set(provider.id, {
        provider,
        status: { loggedIn: false },
        capturedAt: Date.now(),
      });
      this.unsubscribes.push(
        provider.auth.onChange(() => this.refresh(provider.id)),
      );
      void this.refresh(provider.id);
    }

    this.unsubscribes.push(
      this.plugin.onAuthChanged((id) => {
        if (!id) {
          // Empty id means "everything changed" (e.g. provider re-enabled).
          for (const eid of this.entries.keys()) void this.refresh(eid);
          return;
        }
        void this.refresh(id);
      }),
    );

    this.timer = window.setInterval(() => this.render(), 15_000);
    this.render();
  }

  private async refresh(providerId: string): Promise<void> {
    const entry = this.entries.get(providerId);
    if (!entry) return;
    try {
      entry.status = await entry.provider.auth.status();
      entry.capturedAt = Date.now();
    } catch {
      entry.status = { loggedIn: false };
    }
    this.render();
  }

  private render(): void {
    this.el.empty();
    if (this.entries.size === 0) return;

    for (const entry of this.entries.values()) {
      const chip = this.el.createSpan({
        cls: entry.status.loggedIn
          ? "sp-status__chip sp-status__chip--ok"
          : "sp-status__chip sp-status__chip--out",
      });
      chip.title = `${entry.provider.displayName} — click to ${
        entry.status.loggedIn ? "log out" : "log in"
      }`;
      const icon = chip.createSpan({ cls: "sp-status__icon" });
      setIcon(icon, entry.status.loggedIn ? "key-round" : "key-round-off");
      chip.createSpan({
        cls: "sp-status__label",
        text: shortName(entry.provider),
      });
      if (entry.status.loggedIn && entry.status.ttlSec !== undefined) {
        chip.createSpan({
          cls: "sp-status__ttl",
          text: formatTtl(entry.status.ttlSec, entry.capturedAt),
        });
      }
      chip.addEventListener("click", async () => {
        if (entry.status.loggedIn) {
          await entry.provider.auth.logout();
        } else {
          await entry.provider.auth.login();
        }
      });
    }
  }
}

/** Short display name used in the status-bar chip - the full
 *  `displayName` would crowd the bar with three providers visible. */
function shortName(provider: Provider): string {
  switch (provider.id) {
    case "bao":
      return "OpenBao";
    case "1p":
      return "1Password";
    case "vw":
      return "Bitwarden";
    default:
      return provider.displayName;
  }
}

function formatTtl(ttlSec: number, capturedAt: number): string {
  const remaining = Math.max(
    0,
    ttlSec - Math.floor((Date.now() - capturedAt) / 1000),
  );
  if (remaining <= 0) return "expired";
  if (remaining < 60) return `${remaining}s`;
  if (remaining < 3600) return `${Math.floor(remaining / 60)}m`;
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}
