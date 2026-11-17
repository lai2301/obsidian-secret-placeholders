/** Error type shared by every layer of the Proton Pass provider. */

/**
 * What went wrong, as data. Layers below the provider describe a failure
 * here and leave wording it for the user to the provider (see
 * `messages.ts`).
 */
export type Failure =
  /** Node's modules couldn't be loaded. */
  | { readonly kind: "node-unavailable"; readonly detail: string }
  /** The configured binary path isn't an absolute path to pass-cli. */
  | { readonly kind: "invalid-binary" }
  /** Nothing executable at the configured binary path. */
  | { readonly kind: "binary-not-found"; readonly path: string }
  | { readonly kind: "timed-out" }
  | { readonly kind: "not-logged-in" }
  /** A vault, item or field doesn't exist. `detail` is pass-cli's own line. */
  | { readonly kind: "not-found"; readonly detail: string }
  /** pass-cli reported an error. `detail` is its summary line. */
  | { readonly kind: "cli-error"; readonly detail: string }
  /** pass-cli failed without saying why. `reason` is an exit code or signal. */
  | { readonly kind: "failed"; readonly reason?: string }
  /** pass-cli's JSON didn't have the expected shape. */
  | { readonly kind: "unexpected-output" }
  /** The parts can't form a valid `pass://` reference. */
  | { readonly kind: "invalid-reference" }
  /** pass-cli can't express a field name containing "=". */
  | { readonly kind: "equals-in-field"; readonly field: string }
  /** A vault name starting with "-" would be read as a flag. */
  | { readonly kind: "dash-vault"; readonly vault: string };

/** A Proton Pass failure. Its message is the kind, for logs only. */
export class ProtonPassError extends Error {
  override readonly name = "ProtonPassError";

  constructor(readonly failure: Failure) {
    super(failure.kind);
  }

  get kind(): Failure["kind"] {
    return this.failure.kind;
  }
}

/** The message of a caught value, which may not be an Error. */
export const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);
