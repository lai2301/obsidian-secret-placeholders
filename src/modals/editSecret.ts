// Modal that prompts for a new value for an existing placeholder and
// writes it to the provider.  The placeholder text in the note is
// untouched - only the backend secret value changes.
//
// Optionally fetches and displays the *current* value (masked by default,
// click to reveal) so the user can see what they're overwriting.

import { Modal, Notice, Setting, setIcon } from "obsidian";

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
    contentEl.createEl("h3", { text: "Edit secret value" });
    contentEl.createEl("p", {
      cls: "setting-item-description",
      text: `Updates the backend secret only — the placeholder text in your note stays the same.`,
    });
    contentEl.createEl("p", {
      cls: "setting-item-description",
      text: `Provider: ${this.provider.displayName}`,
    });
    contentEl.createEl("p", {
      cls: "setting-item-description",
      text: `Placeholder: ${this.ref.raw}`,
    });

    const currentRow = new Setting(contentEl).setName("Current value");
    const currentValEl = currentRow.controlEl.createSpan({
      cls: "sp-edit__current",
      text: "(click to load)",
    });
    currentRow.addButton((b) => {
      b.setIcon("eye").setTooltip("Show / hide current value").onClick(
        async () => {
          if (this.currentValue === null) {
            currentValEl.setText("loading…");
            try {
              this.currentValue = await this.provider.readKey(this.ref);
              this.currentValueRevealed = true;
            } catch (e) {
              currentValEl.setText(`(error: ${(e as Error).message})`);
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

    new Setting(contentEl).setName("New value").addText((t) => {
      t.inputEl.type = "password";
      t.setPlaceholder("new secret value").onChange((v) => (this.newValue = v));
      t.inputEl.focus();
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void this.submit();
        }
      });
    });

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText("Save")
          .setCta()
          .onClick(() => void this.submit()),
      )
      .addButton((b) =>
        b.setButtonText("Cancel").onClick(() => this.close()),
      );
  }

  private async submit(): Promise<void> {
    if (this.busy) return;
    if (!this.newValue) {
      new Notice("Enter a new value first");
      return;
    }
    this.busy = true;
    try {
      await this.provider.writeKey(this.ref, this.newValue);
      new Notice(`Updated ${this.ref.raw.slice(2, -2)}`);
      this.close();
      // Drop provider + autocomplete caches and re-render every rendered
      // span so the new value shows immediately.
      this.plugin.refreshSecretData();
    } catch (e) {
      this.busy = false;
      new Notice(`Write failed: ${(e as Error).message}`);
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

// Touch setIcon to keep the import next to its usage even if a future
// edit removes the eye button.
void setIcon;
