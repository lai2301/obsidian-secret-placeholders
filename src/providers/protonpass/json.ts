/**
 * Parsers for pass-cli's `--output json` listings. The shapes are assumed
 * stable, and anything else throws rather than guessing.
 */

import { t } from "../../i18n";
import { ProtonPassError } from "./errors";

type Json = Record<string, unknown>;

const unexpectedOutput = (): ProtonPassError =>
  new ProtonPassError("unknown", t("provider.protonpass.unexpectedOutput"));

const isObject = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Read one vault's name from pass-cli 2.7 `vault list --output json`:
 *
 * ```json
 * { "vaults": [{ "name": string, "vault_id": string, "share_id": string }] }
 * ```
 */
const toVaultName = (v: unknown): string => {
  if (!isObject(v) || typeof v.name !== "string") throw unexpectedOutput();
  return v.name;
};

export const vaultNames = (json: unknown): string[] => {
  if (!isObject(json) || !Array.isArray(json.vaults)) throw unexpectedOutput();
  return json.vaults.map(toVaultName);
};

/**
 * The fields read from one entry of pass-cli 2.7 `item list --output json`:
 *
 * ```json
 * { "items": [{ "title": string, "state": "Active" | ..., ... }], "folders": [] }
 * ```
 */
interface ListedItem {
  title: string;
  state: string;
}

const toListedItem = (v: unknown): ListedItem => {
  if (!isObject(v) || typeof v.title !== "string" || typeof v.state !== "string") {
    throw unexpectedOutput();
  }
  return { title: v.title, state: v.state };
};

export const itemTitles = (json: unknown): string[] => {
  if (!isObject(json) || !Array.isArray(json.items)) throw unexpectedOutput();
  return json.items
    .map(toListedItem)
    .filter((it) => it.state === "Active")
    .map((it) => it.title);
};

export const parseJson = (stdout: string): unknown => {
  try {
    return JSON.parse(stdout) as unknown;
  } catch {
    throw unexpectedOutput();
  }
};
