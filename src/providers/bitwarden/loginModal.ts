// Email + master-password modal used by the Bitwarden provider login flow.
// The master password never leaves this process - we use it locally to
// derive keys, then send only the derived password-hash to the server.

import { App, ButtonComponent, Modal, Setting } from "obsidian";

export interface BitwardenCredentials {
  email: string;
  masterPassword: string;
}

export class BitwardenLoginModal extends Modal {
  private email = "";
  private masterPassword = "";
  private submitBtn: ButtonComponent | null = null;
  private busy = false;

  constructor(
    app: App,
    private defaultEmail: string,
    private serverUrl: string,
    private onSubmit: (creds: BitwardenCredentials | null) => void,
  ) {
    super(app);
    this.email = defaultEmail;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Log in to Bitwarden / Vaultwarden" });
    contentEl.createEl("p", {
      text: `Server: ${this.serverUrl || "(set the server URL in settings first)"}`,
    });
    contentEl.createEl("p", {
      text: "Your master password is used locally to derive the keys; only a derived hash is sent to the server.",
      cls: "setting-item-description",
    });

    new Setting(contentEl).setName("Email").addText((t) => {
      t.setValue(this.email).onChange((v) => (this.email = v.trim()));
      t.inputEl.type = "email";
      if (!this.defaultEmail) t.inputEl.focus();
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.submit();
        }
      });
    });

    new Setting(contentEl).setName("Master password").addText((t) => {
      t.inputEl.type = "password";
      t.onChange((v) => (this.masterPassword = v));
      if (this.defaultEmail) t.inputEl.focus();
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.submit();
        }
      });
    });

    new Setting(contentEl)
      .addButton((b) => {
        b.setButtonText("Log in").setCta().onClick(() => this.submit());
        this.submitBtn = b;
      })
      .addButton((b) =>
        b.setButtonText("Cancel").onClick(() => {
          if (this.busy) return;
          this.onSubmit(null);
          this.close();
        }),
      );
  }

  private submit(): void {
    if (this.busy) return;
    if (!this.email || !this.masterPassword) return;
    this.busy = true;
    this.submitBtn?.setButtonText("Logging in…").setDisabled(true);

    const creds = { email: this.email, masterPassword: this.masterPassword };
    // Clear before handing off so the field doesn't linger in any DOM cache.
    this.masterPassword = "";

    // Close synchronously so subsequent modals (e.g. NewDeviceOtpModal) can
    // open cleanly without stacking.  Then yield once before invoking the
    // async callback so the DOM detach has a chance to settle.
    this.close();
    window.setTimeout(() => this.onSubmit(creds), 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

/** 6-digit TOTP code prompt for the Bitwarden two-factor login challenge.
 *  Mirrors NewDeviceOtpModal's lifecycle (busy flag, deferred onSubmit). */
export class TwoFactorOtpModal extends Modal {
  private code = "";
  private submitBtn: ButtonComponent | null = null;
  private busy = false;

  constructor(
    app: App,
    private onSubmit: (code: string | null) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Two-factor authentication" });
    contentEl.createEl("p", {
      text: "Enter the 6-digit code from your authenticator app to finish logging in.",
      cls: "setting-item-description",
    });

    new Setting(contentEl).setName("Code").addText((t) => {
      t.inputEl.inputMode = "numeric";
      t.inputEl.maxLength = 8;
      t.inputEl.focus();
      t.setPlaceholder("123456").onChange(
        (v) => (this.code = v.replace(/\s+/g, "")),
      );
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.submit();
        }
      });
    });

    new Setting(contentEl)
      .addButton((b) => {
        b.setButtonText("Verify").setCta().onClick(() => this.submit());
        this.submitBtn = b;
      })
      .addButton((b) =>
        b.setButtonText("Cancel").onClick(() => {
          if (this.busy) return;
          this.onSubmit(null);
          this.close();
        }),
      );
  }

  private submit(): void {
    if (this.busy) return;
    if (!this.code) return;
    this.busy = true;
    this.submitBtn?.setButtonText("Verifying…").setDisabled(true);

    const code = this.code;
    this.close();
    window.setTimeout(() => this.onSubmit(code), 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

/** 6-digit "new device verification" code prompt.  Bitwarden cloud emails
 *  this when a login originates from a previously-unseen device. */
export class NewDeviceOtpModal extends Modal {
  private code = "";
  private submitBtn: ButtonComponent | null = null;
  private busy = false;

  constructor(
    app: App,
    private email: string,
    private onSubmit: (code: string | null) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "New device verification" });
    contentEl.createEl("p", {
      text: `Bitwarden emailed a 6-digit code to ${this.email}.  Paste it below to finish logging in.  This is a one-time check for this device.`,
      cls: "setting-item-description",
    });

    new Setting(contentEl).setName("Code").addText((t) => {
      t.inputEl.inputMode = "numeric";
      t.inputEl.maxLength = 8;
      t.inputEl.focus();
      t.setPlaceholder("123456").onChange(
        (v) => (this.code = v.replace(/\s+/g, "")),
      );
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.submit();
        }
      });
    });

    new Setting(contentEl)
      .addButton((b) => {
        b.setButtonText("Verify").setCta().onClick(() => this.submit());
        this.submitBtn = b;
      })
      .addButton((b) =>
        b.setButtonText("Cancel").onClick(() => {
          if (this.busy) return;
          this.onSubmit(null);
          this.close();
        }),
      );
  }

  private submit(): void {
    if (this.busy) return;
    if (!this.code) return;
    this.busy = true;
    this.submitBtn?.setButtonText("Verifying…").setDisabled(true);

    const code = this.code;
    this.close();
    window.setTimeout(() => this.onSubmit(code), 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
