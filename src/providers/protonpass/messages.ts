/** User-facing wording for Proton Pass failures. */

import { t } from "../../i18n";
import { type Failure, ProtonPassError, errorMessage } from "./errors";

/** Word `failure` for the user in the active locale. */
export const describeFailure = (failure: Failure): string => {
  switch (failure.kind) {
    case "node-unavailable":
      return failure.detail;
    case "invalid-binary":
      return t("provider.protonpass.invalidBinary");
    case "binary-not-found":
      return t("provider.protonpass.binaryNotFound", { path: failure.path });
    case "timed-out":
      return t("provider.protonpass.timedOut");
    case "not-logged-in":
      return t("provider.protonpass.notLoggedIn");
    case "not-found":
    case "cli-error":
      return failure.detail;
    case "failed":
      return failure.reason === undefined
        ? t("provider.protonpass.failed")
        : t("provider.protonpass.failedWithReason", { reason: failure.reason });
    case "unexpected-output":
      return t("provider.protonpass.unexpectedOutput");
    case "invalid-reference":
      return t("provider.protonpass.invalidReference");
    case "equals-in-field":
      return t("provider.protonpass.equalsInField", { field: failure.field });
    case "dash-vault":
      return t("provider.protonpass.dashVault", { vault: failure.vault });
  }
};

/** Word any caught value for the user. */
export const describeError = (e: unknown): string =>
  e instanceof ProtonPassError ? describeFailure(e.failure) : errorMessage(e);

/**
 * Run `work`, rethrowing a ProtonPassError as a plain Error worded for the
 * user, because callers outside the provider show `message` as is.
 */
export const withUserMessages = async <T>(work: () => Promise<T>): Promise<T> => {
  try {
    return await work();
  } catch (e) {
    throw e instanceof ProtonPassError ? new Error(describeFailure(e.failure)) : e;
  }
};
