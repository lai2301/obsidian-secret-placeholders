// Error type shared by every layer of the Proton Pass provider.

type FailureKind = "unavailable" | "not-logged-in" | "not-found" | "unknown";

export class ProtonPassError extends Error {
  override readonly name = "ProtonPassError";

  constructor(
    readonly kind: FailureKind,
    message: string,
  ) {
    super(message);
  }
}
