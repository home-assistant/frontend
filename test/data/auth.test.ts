import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLoginFlow } from "../../src/data/auth";

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
      "S256"
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
      }),
    });
  });
});
