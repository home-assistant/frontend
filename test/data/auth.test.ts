import { afterEach, describe, expect, it, vi } from "vitest";

import { createLoginFlow } from "../../src/data/auth";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("createLoginFlow", () => {
  it.each([
    {},
    {
      code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      code_challenge_method: "S256",
      response_type: "code",
      state: "opaque state",
    },
    {
      code_challenge: "",
      code_challenge_method: "S256",
    },
    {
      code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      code_challenge_method: "",
    },
    {
      code_challenge: "",
      code_challenge_method: "",
    },
  ])("forwards the authorization request %j", async (parameters) => {
    const fetchMock = vi
      .spyOn(window, "fetch")
      .mockResolvedValue(new Response());

    await createLoginFlow(
      {
        client_id: "https://client.example/",
        redirect_uri: "https://client.example/callback",
        ...parameters,
      },
      ["homeassistant", null]
    );

    expect(fetchMock).toHaveBeenCalledWith("/auth/login_flow", {
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify({
        client_id: "https://client.example/",
        redirect_uri: "https://client.example/callback",
        ...parameters,
        handler: ["homeassistant", null],
      }),
    });
  });
});
