// Thin OpenBao HTTP client. Pure `requestUrl` so it works on mobile.
// All secret values stay in memory; nothing is written to disk by this module.

import { requestUrl, RequestUrlParam } from "obsidian";

export interface KvV2Read {
  data: Record<string, string>;
  metadata: { version: number; created_time: string };
}

export class BaoError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string, message?: string) {
    super(message ?? `OpenBao ${status}: ${body.slice(0, 200)}`);
    this.status = status;
    this.body = body;
  }
}

interface CacheEntry {
  expires: number;
  data: Record<string, string>;
}

export class OpenBaoClient {
  private cache = new Map<string, CacheEntry>();
  private inflight = new Map<string, Promise<Record<string, string>>>();

  constructor(
    private getBaseUrl: () => string,
    private getToken: () => string | null,
    private getCacheTtlSec: () => number,
  ) {}

  clearCache(): void {
    this.cache.clear();
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = this.getToken();
    if (!token) {
      throw new BaoError(401, "no token", "Not logged in to OpenBao");
    }
    const url = `${this.getBaseUrl()}/v1/${path.replace(/^\/+/, "")}`;
    const params: RequestUrlParam = {
      url,
      method,
      headers: {
        "X-Vault-Token": token,
        "Content-Type": "application/json",
      },
      throw: false,
    };
    if (body !== undefined) params.body = JSON.stringify(body);

    const res = await requestUrl(params);
    if (res.status >= 400) {
      throw new BaoError(res.status, res.text);
    }
    if (res.status === 204 || !res.text) return undefined as unknown as T;
    return res.json as T;
  }

  async readSecret(
    mount: string,
    path: string,
  ): Promise<Record<string, string>> {
    const cacheKey = `${mount}/${path}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > now) return cached.data;

    const existing = this.inflight.get(cacheKey);
    if (existing) return existing;

    const p = (async () => {
      const apiPath = `${mount}/data/${path}`;
      const res = await this.request<{ data: KvV2Read }>("GET", apiPath);
      const data = res.data?.data ?? {};
      this.cache.set(cacheKey, {
        data,
        expires: Date.now() + this.getCacheTtlSec() * 1000,
      });
      return data;
    })();

    this.inflight.set(cacheKey, p);
    try {
      return await p;
    } finally {
      this.inflight.delete(cacheKey);
    }
  }

  async readKey(mount: string, path: string, key: string): Promise<string> {
    const data = await this.readSecret(mount, path);
    if (!(key in data)) {
      throw new BaoError(
        404,
        `key '${key}' not found in ${mount}/${path}`,
        `key '${key}' not found`,
      );
    }
    return data[key];
  }

  async writeSecretMerge(
    mount: string,
    path: string,
    data: Record<string, string>,
  ): Promise<void> {
    let existing: Record<string, string> = {};
    try {
      existing = await this.readSecret(mount, path);
    } catch (e) {
      if (!(e instanceof BaoError) || e.status !== 404) throw e;
    }
    const merged = { ...existing, ...data };
    await this.request("POST", `${mount}/data/${path}`, { data: merged });
    this.cache.delete(`${mount}/${path}`);
  }

  async listPath(mount: string, path: string): Promise<string[]> {
    const apiPath = `${mount}/metadata/${path.replace(/\/+$/, "")}/`;
    try {
      const res = await this.request<{ data: { keys: string[] } }>(
        "LIST",
        apiPath,
      );
      return res.data?.keys ?? [];
    } catch (e) {
      if (e instanceof BaoError && e.status === 404) return [];
      throw e;
    }
  }

  async lookupSelf(): Promise<{ ttl: number; policies: string[] }> {
    const res = await this.request<{
      data: { ttl: number; policies: string[] };
    }>("GET", "auth/token/lookup-self");
    return { ttl: res.data.ttl, policies: res.data.policies };
  }

  async renewSelf(): Promise<void> {
    await this.request("POST", "auth/token/renew-self");
  }
}
