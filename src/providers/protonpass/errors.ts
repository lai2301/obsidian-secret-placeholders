/** Error type shared by every layer of the Proton Pass provider. */

/** Broad cause of a {@link ProtonPassError}. */
type FailureKind = "unavailable" | "not-logged-in" | "not-found" | "unknown";

/** A Proton Pass failure whose message is safe to show the user. */
export class ProtonPassError extends Error {
  override readonly name = "ProtonPassError";

  constructor(
    readonly kind: FailureKind,
    message: string,
  ) {
    super(message);
  }
}

/** The message of a caught value, which may not be an Error. */
export const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);
