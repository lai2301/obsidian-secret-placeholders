import { App, Modal, Setting } from "obsidian";
import type { Provider } from "./providers/types";

export class TokenPromptModal extends Modal {
  private token = "";
  constructor(
    app: App,
    private onSubmit: (token: string) => void | Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Paste token" });
    contentEl.createEl("p", {
      text: "Paste an authentication token from your provider. For OpenBao, run `bao login -method=oidc role=obsidian` or copy from the web UI.",
    });
    new Setting(contentEl).addText((t) => {
      t.inputEl.type = "password";
      t.setPlaceholder("token...").onChange((v) => (this.token = v));
      t.inputEl.focus();
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.submit();
      });
    });
    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText("Save")
          .setCta()
          .onClick(() => this.submit()),
      )
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }

  private submit(): void {
    if (!this.token) return;
    const token = this.token;
    this.close();
    void this.onSubmit(token);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class PassphraseModal extends Modal {
  private value = "";
  constructor(
    app: App,
    private title: string,
    private onSubmit: (passphrase: string | null) => void,
  ) {
    super(app);
  }
  onOpen(): void {
    this.contentEl.createEl("h3", { text: this.title });
    new Setting(this.contentEl).addText((t) => {
      t.inputEl.type = "password";
      t.onChange((v) => (this.value = v));
      t.inputEl.focus();
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.submit();
      });
    });
    new Setting(this.contentEl)
      .addButton((b) =>
        b
          .setButtonText("OK")
          .setCta()
          .onClick(() => this.submit()),
      )
      .addButton((b) =>
        b.setButtonText("Cancel").onClick(() => {
          this.onSubmit(null);
          this.close();
        }),
      );
  }
  private submit(): void {
    const v = this.value;
    this.close();
    this.onSubmit(v || null);
  }
  onClose(): void {
    this.contentEl.empty();
  }
}

/** Provider-agnostic ref-editor.  Each part the provider declares becomes
 *  a text field; defaults are pre-filled from suggestRefDefaults().  Field
 *  order follows insertion order of the defaults object. */
export class RefEditorModal extends Modal {
  private parts: Record<string, string>;

  constructor(
    app: App,
    private provider: Provider,
    defaults: Record<string, string>,
    private onSubmit: (parts: Record<string, string> | null) => void,
  ) {
    super(app);
    this.parts = { ...defaults };
  }

  onOpen(): void {
    this.contentEl.createEl("h3", {
      text: `Secret location (${this.provider.displayName})`,
    });

    const optional = new Set(this.provider.optionalRefParts ?? []);

    for (const field of Object.keys(this.parts)) {
      const label = field.charAt(0).toUpperCase() + field.slice(1);
      new Setting(this.contentEl)
        .setName(optional.has(field) ? `${label} (optional)` : label)
        .addText((t) =>
          t
            .setValue(this.parts[field])
            .onChange((v) => (this.parts[field] = v.trim())),
        );
    }

    new Setting(this.contentEl)
      .addButton((b) =>
        b
          .setButtonText("OK")
          .setCta()
          .onClick(() => {
            // Required parts must be non-empty; optional ones may be blank.
            for (const [key, v] of Object.entries(this.parts)) {
              if (!v && !optional.has(key)) return;
            }
            const result = this.parts;
            this.close();
            this.onSubmit(result);
          }),
      )
      .addButton((b) =>
        b.setButtonText("Cancel").onClick(() => {
          this.close();
          this.onSubmit(null);
        }),
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
