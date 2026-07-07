// OIDC browser-callback flow for OpenBao.  Desktop-only - uses Node's
// `http` module via Electron require() to spin up a one-shot loopback
// listener that catches the IdP redirect.  On mobile the caller falls back
// to paste-token.
//
// Flow (matches `bao login -method=oidc role=<role>`):
//   1. POST /v1/auth/oidc/oidc/auth_url -> { auth_url }
//   2. Listen on 127.0.0.1:<port>/oidc/callback.
//   3. Open auth_url in the system browser.
//   4. On redirect, capture {state, code}, GET /v1/auth/oidc/oidc/callback,
//      and pull `auth.client_token` from the response.

import { Platform, requestUrl } from "obsidian";

import { t } from "../../i18n";

export interface OidcLoginOptions {
  baseUrl: string;
  role: string;
  /** First port to try.  Subsequent ports up to +4 are tried on EADDRINUSE. */
  port?: number;
  /** Max seconds to wait for the user to complete the browser flow. */
  timeoutSec?: number;
}

export interface OidcLoginResult {
  token: string;
}

export class OidcLoginError extends Error {}

export async function performOidcLogin(
  opts: OidcLoginOptions,
): Promise<OidcLoginResult> {
  if (!Platform.isDesktopApp) {
    throw new OidcLoginError(
      "OIDC browser login is desktop-only; paste a token instead.",
    );
  }

  const port = await chooseFreePort(opts.port ?? 8250);
  const redirectUri = `http://localhost:${port}/oidc/callback`;

  // 1. Ask OpenBao for the IdP auth URL.
  const authUrlRes = await requestUrl({
    url: `${opts.baseUrl.replace(/\/+$/, "")}/v1/auth/oidc/oidc/auth_url`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: opts.role, redirect_uri: redirectUri }),
    throw: false,
  });
  if (authUrlRes.status >= 400) {
    throw new OidcLoginError(
      `auth_url request failed (${authUrlRes.status}): ${authUrlRes.text.slice(0, 200)}`,
    );
  }
  const authUrl: string | undefined = authUrlRes.json?.data?.auth_url;
  if (!authUrl) {
    throw new OidcLoginError(t("provider.openbao.oidc.noAuthUrl"));
  }

  // 2. Set up the loopback listener and 3. open the browser concurrently.
  const callbackPromise = waitForCallback(port, opts.timeoutSec ?? 180);
  openInBrowser(authUrl);

  const { state, code } = await callbackPromise;

  // 4. Exchange the code for a Vault token.
  const params = new URLSearchParams({ state, code });
  const cbRes = await requestUrl({
    url: `${opts.baseUrl.replace(/\/+$/, "")}/v1/auth/oidc/oidc/callback?${params.toString()}`,
    method: "GET",
    throw: false,
  });
  if (cbRes.status >= 400) {
    throw new OidcLoginError(
      `callback failed (${cbRes.status}): ${cbRes.text.slice(0, 200)}`,
    );
  }
  const token: string | undefined = cbRes.json?.auth?.client_token;
  if (!token) {
    throw new OidcLoginError(t("provider.openbao.oidc.noClientToken"));
  }
  return { token };
}

// --- Node-only helpers (loaded lazily so the bundle stays mobile-safe) ----

interface Callback {
  state: string;
  code: string;
}

async function waitForCallback(
  port: number,
  timeoutSec: number,
): Promise<Callback> {
  // Electron desktop only: reach Node's http via window.require for the OIDC loopback server.
  const http = (window as unknown as { require: NodeJS.Require }).require(
    "http",
  ) as typeof import("http");

  return new Promise<Callback>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url || !req.url.startsWith("/oidc/callback")) {
        res.writeHead(404).end();
        return;
      }
      const url = new URL(req.url, `http://localhost:${port}`);
      const state = url.searchParams.get("state");
      const code = url.searchParams.get("code");

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      if (state && code) {
        res.end(SUCCESS_HTML);
        server.close();
        resolve({ state, code });
      } else {
        res.end(FAILURE_HTML);
        server.close();
        reject(
          new OidcLoginError(t("provider.openbao.oidc.missingParams")),
        );
      }
    });

    const timer = window.setTimeout(() => {
      server.close();
      reject(
        new OidcLoginError(
          t("provider.openbao.oidc.timeout", { sec: timeoutSec }),
        ),
      );
    }, timeoutSec * 1000);
    server.on("close", () => window.clearTimeout(timer));
    server.on("error", reject);
    server.listen(port, "127.0.0.1");
  });
}

async function chooseFreePort(start: number): Promise<number> {
  // Electron desktop only: reach Node's net via window.require to probe for a free loopback port.
  const net = (window as unknown as { require: NodeJS.Require }).require(
    "net",
  ) as typeof import("net");

  for (let port = start; port < start + 5; port++) {
    const ok = await new Promise<boolean>((resolve) => {
      const s = net.createServer();
      s.once("error", () => resolve(false));
      s.once("listening", () => {
        s.close(() => resolve(true));
      });
      s.listen(port, "127.0.0.1");
    });
    if (ok) return port;
  }
  throw new OidcLoginError(`no free port found in ${start}..${start + 4}`);
}

interface ElectronModule {
  shell: { openExternal(url: string): Promise<void> };
}

function openInBrowser(url: string): void {
  // Obsidian's Electron build registers window.open for external URLs.
  // shell.openExternal is the documented escape hatch.
  try {
    // Electron desktop only: reach electron.shell via window.require to open the browser for OIDC.
    const electron = (window as unknown as { require: NodeJS.Require }).require(
      "electron",
    ) as ElectronModule;
    void electron.shell.openExternal(url);
  } catch {
    window.open(url);
  }
}

const SUCCESS_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Login complete</title>
<style>body{font-family:system-ui,sans-serif;text-align:center;padding:48px;color:#333}</style>
</head><body>
<h1>You're logged in.</h1>
<p>Return to Obsidian; this tab can be closed.</p>
</body></html>`;

const FAILURE_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Login failed</title></head><body>
<h1>Login failed</h1>
<p>Missing state or code in the redirect. Return to Obsidian and try again.</p>
</body></html>`;
