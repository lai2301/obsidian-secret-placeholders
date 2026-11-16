// Modal that prompts for a new value for an existing placeholder and
// writes it to the provider.  The placeholder text in the note is
// untouched - only the backend secret value changes.
//
// Optionally fetches and displays the *current* value (masked by default,
// click to reveal) so the user can see what they're overwriting.

import { Modal, Notice, Setting, setIcon } from "obsidian";

import { t } from "../i18n";
import type SecretPlaceholdersPlugin from "../main";
import type { Provider, ProviderRef } from "../providers/types";

export function openEditSecretModal(
  plugin: SecretPlaceholdersPlugin,
  provider: Provider,
  ref: ProviderRef,
): void {
  new EditSecretModal(plugin, provider, ref).open();
}

class EditSecretModal extends Modal {
  private newValue = "";
  private currentValue: string | null = null;
  private currentValueRevealed = false;
  private busy = false;

  constructor(
    private plugin: SecretPlaceholdersPlugin,
    private provider: Provider,
    private ref: ProviderRef,
  ) {
    super(plugin.app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: t("modal.editSecret.title") });
    contentEl.createEl("p", {
      cls: "setting-item-description",
      text: t("modal.editSecret.desc"),
    });
    contentEl.createEl("p", {
      cls: "setting-item-description",
      text: t("modal.editSecret.provider", { provider: this.provider.displayName }),
    });
    contentEl.createEl("p", {
      cls: "setting-item-description",
      text: t("modal.editSecret.placeholder", { ref: this.ref.raw }),
    });

    const currentRow = new Setting(contentEl).setName(t("modal.editSecret.currentValue"));
    const currentValEl = currentRow.controlEl.createSpan({
      cls: "sp-edit__current",
      text: t("modal.editSecret.clickToLoad"),
    });
    currentRow.addButton((b) => {
      b.setIcon("eye").setTooltip(t("modal.editSecret.showHide")).onClick(
        async () => {
          if (this.currentValue === null) {
            currentValEl.setText(t("modal.editSecret.loading"));
            try {
              this.currentValue = await this.provider.readKey(this.ref);
              this.currentValueRevealed = true;
            } catch (e) {
              currentValEl.setText(t("modal.editSecret.error", { msg: (e as Error).message }));
              return;
            }
          } else {
            this.currentValueRevealed = !this.currentValueRevealed;
          }
          currentValEl.setText(
            this.currentValueRevealed
              ? (this.currentValue ?? "")
              : "•".repeat(Math.max(4, this.currentValue?.length ?? 4)),
          );
        },
      );
    });

    new Setting(contentEl).setName(t("modal.editSecret.newValue")).addText((txt) => {
      txt.inputEl.type = "password";
      txt.setPlaceholder(t("modal.editSecret.newValuePlaceholder")).onChange((v) => (this.newValue = v));
      txt.inputEl.focus();
      txt.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void this.submit();
        }
      });
    });

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText(t("button.save"))
          .setCta()
          .onClick(() => void this.submit()),
      )
      .addButton((b) =>
        b.setButtonText(t("button.cancel")).onClick(() => this.close()),
      );
  }

  private async submit(): Promise<void> {
    if (this.busy) return;
    if (!this.newValue) {
      new Notice(t("modal.editSecret.enterValueFirst"));
      return;
    }
    this.busy = true;
    try {
      await this.provider.writeKey(this.ref, this.newValue);
      new Notice(t("modal.editSecret.updated", { ref: this.ref.raw.slice(2, -2) }));
      this.close();
      // Drop provider + autocomplete caches and re-render every rendered
      // span so the new value shows immediately.
      this.plugin.refreshSecretData();
    } catch (e) {
      this.busy = false;
      new Notice(t("modal.editSecret.writeFailed", { msg: (e as Error).message }));
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

// Touch setIcon to keep the import next to its usage even if a future
// edit removes the eye button.
void setIcon;
