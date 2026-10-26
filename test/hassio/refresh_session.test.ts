import { afterEach, assert, describe, it, vi } from "vitest";
import { refreshHassioSession } from "../../src/data/hassio/ingress";
import type { HomeAssistant } from "../../src/types";

describe("Refresh hassio session", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the session when it is still valid", async () => {
    const calls: string[] = [];
    const hass = {
      callWS: async (msg: { endpoint: string }) => {
        calls.push(msg.endpoint);
        return {};
      },
    } as unknown as Pick<HomeAssistant, "callWS">;

    const session = await refreshHassioSession(hass, "old-session");

    assert.strictEqual(session, "old-session");
    assert.deepEqual(calls, ["/ingress/validate_session"]);
  });

  it("creates a new session when validation fails", async () => {
    vi.stubGlobal("document", {});
    vi.stubGlobal("location", { protocol: "http:" });
    const calls: string[] = [];
    const hass = {
      callWS: async (msg: { endpoint: string }) => {
        calls.push(msg.endpoint);
        if (msg.endpoint === "/ingress/validate_session") {
          throw new Error("Unauthorized");
        }
        return { session: "new-session" };
      },
    } as unknown as Pick<HomeAssistant, "callWS">;

    const session = await refreshHassioSession(hass, "old-session");

    assert.strictEqual(session, "new-session");
    assert.deepEqual(calls, ["/ingress/validate_session", "/ingress/session"]);
    assert.strictEqual(
      global.document.cookie,
      "ingress_session=new-session;path=/api/hassio_ingress/;SameSite=Strict"
    );
  });

  it("rejects when neither validation nor creation works", async () => {
    const hass = {
      callWS: async () => {
        throw new Error("Connection lost");
      },
    } as unknown as Pick<HomeAssistant, "callWS">;

    const result = await refreshHassioSession(hass, "old-session").then(
      () => "resolved",
      () => "rejected"
    );

    assert.strictEqual(result, "rejected");
  });
});
