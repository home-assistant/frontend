import { afterEach, assert, describe, it, vi } from "vitest";
import { refreshHassioSession } from "../../src/data/hassio/ingress";
import type { HomeAssistant } from "../../src/types";

interface IngressMessage {
  type: string;
  slug?: string;
  session?: string;
}

describe("Refresh hassio session", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the session when it is still valid", async () => {
    const calls: IngressMessage[] = [];
    const hass = {
      callWS: async (msg: IngressMessage) => {
        calls.push(msg);
        return {};
      },
    } as unknown as Pick<HomeAssistant, "callWS">;

    const session = await refreshHassioSession(hass, "my_app", "old-session");

    assert.strictEqual(session, "old-session");
    assert.deepEqual(calls, [
      { type: "supervisor/ingress/validate_session", session: "old-session" },
    ]);
  });

  it("creates a new session for the app when validation fails", async () => {
    vi.stubGlobal("document", {});
    vi.stubGlobal("location", { protocol: "http:" });
    const calls: IngressMessage[] = [];
    const hass = {
      callWS: async (msg: IngressMessage) => {
        calls.push(msg);
        if (msg.type === "supervisor/ingress/validate_session") {
          throw new Error("Unauthorized");
        }
        return { session: "new-session" };
      },
    } as unknown as Pick<HomeAssistant, "callWS">;

    const session = await refreshHassioSession(hass, "my_app", "old-session");

    assert.strictEqual(session, "new-session");
    assert.deepEqual(calls, [
      { type: "supervisor/ingress/validate_session", session: "old-session" },
      { type: "supervisor/ingress/session", slug: "my_app" },
    ]);
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

    const result = await refreshHassioSession(
      hass,
      "my_app",
      "old-session"
    ).then(
      () => "resolved",
      () => "rejected"
    );

    assert.strictEqual(result, "rejected");
  });
});
