// Proton Pass provider.  Shells out to the official `pass-cli` binary, which
// owns the session (login happens in a terminal with `pass-cli login`).
// Desktop only: spawning a process needs Node's child_process.
//
// Placeholder syntax: {{pp:<vault>/<item>/<field>}}
//   - maps 1:1 onto pass-cli's secret reference pass://<vault>/<item>/<field>
//   - <vault> = vault name, <item> = item title, <field> = field name
//     (e.g. "password", "username", "email", or a custom field)
//
// Read-only: reading and listing are supported, creating or editing items
// is not.
//
// Security notes:
//   - the binary path comes from plugin settings only, never note content;
//   - the process runs without a shell, so a ref is always a single argv
//     element and spaces / shell metacharacters are inert;
//   - errors surface stderr only, never stdout (which may hold a secret).

import { Notice, Platform, Setting } from "obsidian";

import { t } from "../i18n";
import { renderAuthStatusRow } from "../authStatusRow";
import {
  NoteContext,
  PluginContext,
  Provider,
  ProviderAuth,
  ProviderAuthStatus,
  ProviderRef,
} from "./types";

// --- types ---------------------------------------------------------------

export interface ProtonPassSettings {
  /** Absolute path to the pass-cli binary.  Obsidian launched from the
   *  dock does not inherit the shell PATH, so a bare name won't resolve. */
  binaryPath: string;
  defaultVault: string;
  cacheTtlSec: number;
}

function defaultBinaryPath(): string {
  if (Platform.isWin) return "C:\\Program Files\\Proton\\Pass CLI\\pass-cli.exe";
  if (Platform.isMacOS) return "/opt/homebrew/bin/pass-cli";
  return "/usr/local/bin/pass-cli";
}

const DEFAULTS: ProtonPassSettings = {
  binaryPath: "",
  defaultVault: "",
  cacheTtlSec: 300,
};

const TIMEOUT_MS = 10_000;
// `item view` prints one field; `item list` prints whole items as JSON.
const VIEW_MAX_BUFFER = 64 * 1024;
const LIST_MAX_BUFFER = 8 * 1024 * 1024;
const MAX_LIST_ITEMS = 500;

// {{pp:<vault>/<item>/<field>}}
// `/` separates segments, so it can't appear inside one; `{` and `}` are
// forbidden so the closing braces still terminate.
const PLACEHOLDER_RE = /\{\{pp:([^/{}]+)\/([^/{}]+)\/([^/{}]+)\}\}/g;

// Derived from recorded pass-cli 2.7 stderr. Don't guess these.
const AUTH_PATTERNS = [/requires an authenticated client/, /there is no session/];
const NOT_FOUND_PATTERNS = [
  /Could not find vault /,
  /Could not find item /,
  /Field does not exist: /,
];

function hasControlChars(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return true;
  }
  return false;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// --- process -------------------------------------------------------------

interface ExecError extends Error {
  code?: string | number;
  killed?: boolean;
}

interface NodeChildProcess {
  execFile(
    file: string,
    args: string[],
    options: {
      shell: false;
      timeout: number;
      maxBuffer: number;
      windowsHide: boolean;
      encoding: "utf8";
    },
    callback: (err: ExecError | null, stdout: string, stderr: string) => void,
  ): void;
}

// Node interop is desktop-only and reached through Electron's require().
function requireNode<T>(id: string): T {
  const req = (window as unknown as { require: (id: string) => unknown })
    .require;
  return req(id) as T;
}

type FailureKind = "unavailable" | "not-logged-in" | "not-found" | "unknown";

export class ProtonPassError extends Error {
  constructor(
    readonly kind: FailureKind,
    message: string,
  ) {
    super(message);
  }
}

// pass-cli colours its log lines; strip ANSI escapes before matching or
// showing them.
function firstLine(stderr: string): string {
  // eslint-disable-next-line no-control-regex -- matching ESC is the point
  const plain = stderr.replace(/\u001b\[[0-9;]*m/g, "");
  const line = plain.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
  return line.trim().slice(0, 200);
}

function matchesAny(patterns: RegExp[], s: string): boolean {
  return patterns.some((p) => p.test(s));
}

function classifyStderr(stderr: string): ProtonPassError {
  if (matchesAny(AUTH_PATTERNS, stderr)) {
    return new ProtonPassError("not-logged-in", t("provider.protonpass.notLoggedIn"));
  }
  if (matchesAny(NOT_FOUND_PATTERNS, stderr)) {
    // The useful line ("Could not find item ...") is the last cause, not
    // the first line.
    const cause =
      stderr
        .split(/\r?\n/)
        .reverse()
        .find((l) => matchesAny(NOT_FOUND_PATTERNS, l)) ?? stderr;
    return new ProtonPassError("not-found", firstLine(cause.replace(/^\s*\d+:\s*/, "")));
  }
  return new ProtonPassError("unknown", firstLine(stderr) || "pass-cli failed");
}

class PassCli {
  constructor(private getBinaryPath: () => string) {}

  /** Run pass-cli with argv and resolve to stdout.  Rejects with a
   *  ProtonPassError whose message never contains stdout. */
  run(args: string[], maxBuffer: number): Promise<string> {
    const bin = this.getBinaryPath();
    if (!isValidBinaryPath(bin)) {
      return Promise.reject(
        new ProtonPassError("unavailable", t("provider.protonpass.invalidBinary")),
      );
    }
    return new Promise((resolve, reject) => {
      try {
        const cp = requireNode<NodeChildProcess>("child_process");
        cp.execFile(
          bin,
          args,
          {
            shell: false,
            timeout: TIMEOUT_MS,
            maxBuffer,
            windowsHide: true,
            encoding: "utf8",
          },
          (err, stdout, stderr) => {
            if (!err) return resolve(stdout);
            if (err.code === "ENOENT" || err.code === "EACCES") {
              return reject(
                new ProtonPassError("unavailable", t("provider.protonpass.binaryNotFound", { path: bin })),
              );
            }
            if (err.killed) {
              return reject(new ProtonPassError("unknown", "pass-cli timed out"));
            }
            if (typeof err.code === "number") return reject(classifyStderr(stderr));
            reject(new ProtonPassError("unknown", String(err.code ?? err.message)));
          },
        );
      } catch (e) {
        reject(new ProtonPassError("unavailable", (e as Error).message));
      }
    });
  }
}

/** Absolute path whose file name is pass-cli itself, so settings can't be
 *  pointed at an arbitrary program by accident. */
function isValidBinaryPath(p: string): boolean {
  if (!p || p.includes("\u0000")) return false;
  const absolute = Platform.isWin ? /^[A-Za-z]:[\\/]|^\\\\/.test(p) : p.startsWith("/");
  const name = p.split(/[\\/]/).pop() ?? "";
  const allowed = Platform.isWin ? ["pass-cli.exe", "pass-cli"] : ["pass-cli"];
  return absolute && allowed.includes(name);
}

// --- JSON shapes ---------------------------------------------------------
// pass-cli's --output json shape isn't documented as stable, so read it
// defensively: accept a bare array or an object wrapping one.

type Json = Record<string, unknown>;

function isObject(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function arrayIn(json: unknown, key: string): unknown[] {
  if (Array.isArray(json)) return json;
  if (isObject(json) && Array.isArray(json[key])) return json[key] as unknown[];
  return [];
}

function stringAt(obj: unknown, ...path: string[]): string | null {
  let cur: unknown = obj;
  for (const k of path) {
    if (!isObject(cur)) return null;
    cur = cur[k];
  }
  return typeof cur === "string" ? cur : null;
}

function vaultNames(json: unknown): string[] {
  return arrayIn(json, "vaults")
    .map((v) => stringAt(v, "name"))
    .filter((n): n is string => !!n);
}

function itemTitles(json: unknown): string[] {
  return arrayIn(json, "items")
    .filter((it) => !/trash/i.test(stringAt(it, "state") ?? ""))
    .map((it) => stringAt(it, "title") ?? stringAt(it, "content", "title"))
    .filter((n): n is string => !!n);
}

function parseJson(stdout: string): unknown {
  try {
    return JSON.parse(stdout) as unknown;
  } catch {
    throw new ProtonPassError("unknown", "pass-cli returned unexpected output");
  }
}

// --- provider ------------------------------------------------------------

/** A pass:// reference is safe to hand to pass-cli when every segment is
 *  non-empty, `/`-free and free of control characters. */
function toPassRef(parts: Record<string, string>): string | null {
  const segs = [parts.vault, parts.item, parts.field];
  for (const s of segs) {
    if (!s || s.includes("/") || hasControlChars(s)) return null;
  }
  return `pass://${segs.join("/")}`;
}

export class ProtonPassProvider implements Provider {
  readonly id = "pp";
  readonly displayName = "Proton Pass";
  readonly placeholderPrefix = "pp:";
  readonly placeholderRegex = PLACEHOLDER_RE;
  readonly readOnly = true;

  private settings: ProtonPassSettings = { ...DEFAULTS };
  private cli: PassCli;
  // Holds lookups, not values, so concurrent reads of one ref share a
  // single pass-cli call.  Failures are dropped once they settle.
  private cache = new Map<string, { expires: number; value: Promise<string> }>();
  auth: ProviderAuth;

  private listeners = new Set<() => void>();

  constructor(private ctx: PluginContext) {
    this.cli = new PassCli(() => this.settings.binaryPath);

    this.auth = {
      status: async (): Promise<ProviderAuthStatus> => {
        try {
          await this.listVaults();
          return { loggedIn: true };
        } catch {
          return { loggedIn: false };
        }
      },
      // pass-cli login is interactive (browser / TOTP prompts), so it has
      // to happen in a terminal.  Re-check afterwards in case the user
      // already did it.
      login: async () => {
        this.clearCache();
        const status = await this.auth.status();
        if (status.loggedIn) {
          new Notice(t("provider.protonpass.loggedIn"));
        } else {
          new Notice(t("provider.protonpass.loginHint"), 10_000);
        }
        this.ctx.notifyAuthChanged(this.id);
        this.notify();
      },
      logout: async () => {
        try {
          await this.cli.run(["logout"], VIEW_MAX_BUFFER);
        } catch (e) {
          new Notice((e as Error).message);
        }
        this.clearCache();
        this.ctx.notifyAuthChanged(this.id);
        this.notify();
      },
      onChange: (cb) => {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
      },
    };
  }

  private notify(): void {
    for (const cb of this.listeners) {
      try {
        cb();
      } catch {
        /* swallow */
      }
    }
  }

  async init(): Promise<void> {
    const saved = await this.ctx.loadProviderData<ProtonPassSettings>(this.id);
    if (saved) this.settings = { ...DEFAULTS, ...saved };
    if (!this.settings.binaryPath) this.settings.binaryPath = defaultBinaryPath();
  }

  private async persist(): Promise<void> {
    await this.ctx.saveProviderData(this.id, this.settings);
  }

  parseRef(raw: string): ProviderRef | null {
    const m = new RegExp(PLACEHOLDER_RE.source).exec(raw);
    if (!m) return null;
    const parts = { vault: m[1], item: m[2], field: m[3] };
    if (!toPassRef(parts)) return null;
    return { provider: this.id, raw: m[0], parts };
  }

  formatRef(parts: Record<string, string>): string {
    const { vault, item, field } = parts;
    return `{{pp:${vault}/${item}/${field}}}`;
  }

  /** Cached by key; a rejected promise is evicted so a retry asks again. */
  private cached(key: string, load: () => Promise<string>): Promise<string> {
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && hit.expires > now) return hit.value;
    const value = load();
    const entry = { expires: now + this.settings.cacheTtlSec * 1000, value };
    this.cache.set(key, entry);
    value.catch(() => {
      if (this.cache.get(key) === entry) this.cache.delete(key);
    });
    return value;
  }

  async readKey(ref: ProviderRef): Promise<string> {
    const passRef = toPassRef(ref.parts);
    if (!passRef) {
      throw new ProtonPassError("not-found", t("provider.protonpass.invalidRef"));
    }
    const stdout = await this.cached(`view:${passRef}`, () =>
      this.cli.run(["item", "view", passRef], VIEW_MAX_BUFFER),
    );
    // Strip exactly one trailing newline; secrets may end in spaces.
    return stdout.replace(/\r?\n$/, "");
  }

  async writeKey(): Promise<void> {
    throw new ProtonPassError("unknown", t("provider.protonpass.readOnly"));
  }

  private async listVaults(): Promise<string[]> {
    const stdout = await this.cached("vaults", () =>
      this.cli.run(["vault", "list", "--output", "json"], LIST_MAX_BUFFER),
    );
    return vaultNames(parseJson(stdout));
  }

  private async listItems(vault: string): Promise<string[]> {
    const stdout = await this.cached(`items:${vault}`, () =>
      this.cli.run(["item", "list", vault, "--output", "json"], LIST_MAX_BUFFER),
    );
    return itemTitles(parseJson(stdout));
  }

  async list(): Promise<ProviderRef[]> {
    const vaults = await this.listVaults();
    const wanted = this.settings.defaultVault.trim();
    const candidates = wanted ? vaults.filter((v) => v === wanted) : vaults;
    // A leading "-" would be read as a flag by pass-cli.
    const targets = candidates.filter((v) => !v.startsWith("-"));
    const out: ProviderRef[] = [];
    for (const vault of targets) {
      const titles = await this.listItems(vault).catch(() => [] as string[]);
      for (const item of titles) {
        if (out.length >= MAX_LIST_ITEMS) return out;
        // Listing doesn't tell us which fields an item has without
        // fetching each one, so surface the conventional "password"
        // field; the user can edit the placeholder to point elsewhere.
        const parts = { vault, item, field: "password" };
        if (!toPassRef(parts)) continue;
        out.push({ provider: this.id, raw: this.formatRef(parts), parts });
      }
    }
    return out;
  }

  clearCache(): void {
    this.cache.clear();
  }

  suggestRefDefaults(ctx: NoteContext): Record<string, string> {
    return {
      vault: this.settings.defaultVault || "Personal",
      item: slugify(ctx.basename ?? "untitled"),
      field: "password",
    };
  }

  renderSettings(containerEl: HTMLElement): void {
    new Setting(containerEl).setName(t("provider.protonpass.heading")).setHeading();

    renderAuthStatusRow(containerEl, this);

    new Setting(containerEl)
      .setName(t("provider.protonpass.binaryPath.name"))
      .setDesc(t("provider.protonpass.binaryPath.desc"))
      .addText((txt) =>
        txt
          .setPlaceholder(defaultBinaryPath())
          .setValue(this.settings.binaryPath)
          .onChange(async (v) => {
            this.settings.binaryPath = v.trim();
            this.clearCache();
            await this.persist();
          }),
      );

    new Setting(containerEl)
      .setName(t("provider.protonpass.defaultVault.name"))
      .setDesc(t("provider.protonpass.defaultVault.desc"))
      .addText((txt) =>
        txt.setValue(this.settings.defaultVault).onChange(async (v) => {
          this.settings.defaultVault = v.trim();
          await this.persist();
        }),
      );

    new Setting(containerEl)
      .setName(t("provider.protonpass.cacheTtl.name"))
      .setDesc(t("provider.protonpass.cacheTtl.desc"))
      .addText((txt) =>
        txt.setValue(String(this.settings.cacheTtlSec)).onChange(async (v) => {
          const n = Number(v);
          if (!Number.isFinite(n) || n < 0) return;
          this.settings.cacheTtlSec = n;
          await this.persist();
        }),
      );
  }
}
