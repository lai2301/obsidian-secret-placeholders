// Email + master-password modal used by the Bitwarden provider login flow.
// The master password never leaves this process - we use it locally to
// derive keys, then send only the derived password-hash to the server.

import { App, ButtonComponent, Modal, Setting } from "obsidian";

import { t } from "../../i18n";

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
    private onSubmit: (creds: BitwardenCredentials | null) => void | Promise<void>,
  ) {
    super(app);
    this.email = defaultEmail;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: t("provider.bitwarden.loginTitle") });
    contentEl.createEl("p", {
      text: t("provider.bitwarden.loginServer", {
        server: this.serverUrl || t("provider.bitwarden.loginServerUnset"),
      }),
    });
    contentEl.createEl("p", {
      text: t("provider.bitwarden.loginMasterPasswordHint"),
      cls: "setting-item-description",
    });

    new Setting(contentEl).setName(t("provider.bitwarden.emailField")).addText((txt) => {
      txt.setValue(this.email).onChange((v) => (this.email = v.trim()));
      txt.inputEl.type = "email";
      if (!this.defaultEmail) txt.inputEl.focus();
      txt.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.submit();
        }
      });
    });

    new Setting(contentEl).setName(t("provider.bitwarden.masterPassword")).addText((txt) => {
      txt.inputEl.type = "password";
      txt.onChange((v) => (this.masterPassword = v));
      if (this.defaultEmail) txt.inputEl.focus();
      txt.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.submit();
        }
      });
    });

    new Setting(contentEl)
      .addButton((b) => {
        b.setButtonText(t("button.logIn")).setCta().onClick(() => this.submit());
        this.submitBtn = b;
      })
      .addButton((b) =>
        b.setButtonText(t("button.cancel")).onClick(() => {
          if (this.busy) return;
          void this.onSubmit(null);
          this.close();
        }),
      );
  }

  private submit(): void {
    if (this.busy) return;
    if (!this.email || !this.masterPassword) return;
    this.busy = true;
    this.submitBtn?.setButtonText(t("provider.bitwarden.loggingIn")).setDisabled(true);

    const creds = { email: this.email, masterPassword: this.masterPassword };
    // Clear before handing off so the field doesn't linger in any DOM cache.
    this.masterPassword = "";

    // Close synchronously so subsequent modals (e.g. NewDeviceOtpModal) can
    // open cleanly without stacking.  Then yield once before invoking the
    // async callback so the DOM detach has a chance to settle.
    this.close();
    window.setTimeout(() => void this.onSubmit(creds), 0);
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
    contentEl.createEl("h3", { text: t("provider.bitwarden.twoFactorTitle") });
    contentEl.createEl("p", {
      text: t("provider.bitwarden.twoFactorHint"),
      cls: "setting-item-description",
    });

    new Setting(contentEl).setName(t("provider.bitwarden.code")).addText((txt) => {
      txt.inputEl.inputMode = "numeric";
      txt.inputEl.maxLength = 8;
      txt.inputEl.focus();
      txt.setPlaceholder("123456").onChange(
        (v) => (this.code = v.replace(/\s+/g, "")),
      );
      txt.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.submit();
        }
      });
    });

    new Setting(contentEl)
      .addButton((b) => {
        b.setButtonText(t("provider.bitwarden.verify")).setCta().onClick(() => this.submit());
        this.submitBtn = b;
      })
      .addButton((b) =>
        b.setButtonText(t("button.cancel")).onClick(() => {
          if (this.busy) return;
          void this.onSubmit(null);
          this.close();
        }),
      );
  }

  private submit(): void {
    if (this.busy) return;
    if (!this.code) return;
    this.busy = true;
    this.submitBtn?.setButtonText(t("provider.bitwarden.verifying")).setDisabled(true);

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
    contentEl.createEl("h3", { text: t("provider.bitwarden.newDeviceTitle") });
    contentEl.createEl("p", {
      text: t("provider.bitwarden.newDeviceHint", { email: this.email }),
      cls: "setting-item-description",
    });

    new Setting(contentEl).setName(t("provider.bitwarden.code")).addText((txt) => {
      txt.inputEl.inputMode = "numeric";
      txt.inputEl.maxLength = 8;
      txt.inputEl.focus();
      txt.setPlaceholder("123456").onChange(
        (v) => (this.code = v.replace(/\s+/g, "")),
      );
      txt.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.submit();
        }
      });
    });

    new Setting(contentEl)
      .addButton((b) => {
        b.setButtonText(t("provider.bitwarden.verify")).setCta().onClick(() => this.submit());
        this.submitBtn = b;
      })
      .addButton((b) =>
        b.setButtonText(t("button.cancel")).onClick(() => {
          if (this.busy) return;
          void this.onSubmit(null);
          this.close();
        }),
      );
  }

  private submit(): void {
    if (this.busy) return;
    if (!this.code) return;
    this.busy = true;
    this.submitBtn?.setButtonText(t("provider.bitwarden.verifying")).setDisabled(true);

    const code = this.code;
    this.close();
    window.setTimeout(() => this.onSubmit(code), 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
