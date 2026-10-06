import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLoginFlow, redirectWithAuthCode } from "../../src/data/auth";

describe("createLoginFlow", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("posts basic login flow without PKCE parameters", async () => {
    await createLoginFlow(
      "https://myclient.com",
      "https://myclient.com/callback",
      ["homeassistant", null]
    );

    expect(fetch).toHaveBeenCalledWith("/auth/login_flow", {
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify({
        client_id: "https://myclient.com",
        handler: ["homeassistant", null],
        redirect_uri: "https://myclient.com/callback",
      }),
    });
  });

  it("posts login flow with code_challenge and code_challenge_method", async () => {
    await createLoginFlow(
      "https://myclient.com",
      "https://myclient.com/callback",
      ["homeassistant", null],
      "E9Melhoa2OwvFrGMTJguCHaoeK1t8URWbuGJSstw-cM",
      "S256",
      "code"
    );

    expect(fetch).toHaveBeenCalledWith("/auth/login_flow", {
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify({
        client_id: "https://myclient.com",
        handler: ["homeassistant", null],
        redirect_uri: "https://myclient.com/callback",
        code_challenge: "E9Melhoa2OwvFrGMTJguCHaoeK1t8URWbuGJSstw-cM",
        code_challenge_method: "S256",
        response_type: "code",
      }),
    });
  });

  it("posts empty PKCE parameters", async () => {
    await createLoginFlow(
      "https://myclient.com",
      "https://myclient.com/callback",
      ["homeassistant", null],
      "",
      ""
    );

    expect(fetch).toHaveBeenCalledWith("/auth/login_flow", {
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify({
        client_id: "https://myclient.com",
        handler: ["homeassistant", null],
        redirect_uri: "https://myclient.com/callback",
        code_challenge: "",
        code_challenge_method: "",
      }),
    });
  });
});

describe("redirectWithAuthCode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("preserves the browser client's complete state payload", () => {
    const assign = vi.fn();
    vi.stubGlobal("document", { location: { assign } });
    const state = btoa(
      JSON.stringify({
        hassUrl: "https://home-assistant.example",
        clientId: "https://client.example/",
        pkce: "transaction-handle",
      })
    );

    redirectWithAuthCode(
      "https://client.example/callback?auth_callback=1",
      "code",
      state,
      true
    );

    const callbackUrl = new URL(assign.mock.calls[0][0]);
    expect(callbackUrl.searchParams.get("state")).toBe(state);
  });

  it("preserves an empty state", () => {
    const assign = vi.fn();
    vi.stubGlobal("document", { location: { assign } });

    redirectWithAuthCode(
      "https://client.example/callback?existing=value",
      "authorization code",
      "",
      false
    );

    expect(assign).toHaveBeenCalledWith(
      "https://client.example/callback?existing=value&code=authorization%20code&state="
    );
  });

  it("keeps the legacy callback shape", () => {
    const assign = vi.fn();
    vi.stubGlobal("document", { location: { assign } });

    redirectWithAuthCode(
      "https://client.example/callback",
      "code",
      undefined,
      true
    );

    expect(assign).toHaveBeenCalledWith(
      "https://client.example/callback?code=code&storeToken=true"
    );
  });
});
