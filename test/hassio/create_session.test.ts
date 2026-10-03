import { afterEach, assert, describe, it, vi } from "vitest";
import { createHassioSession } from "../../src/data/hassio/ingress";
import type { HomeAssistant } from "../../src/types";

describe("Create hassio session", () => {
  const hass = {
    callWS: async () => ({
      session: "fhdsu73rh3io4h8f3irhjel8ousafehf8f3yh",
    }),
  } as unknown as Pick<HomeAssistant, "callWS">;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Test create session without HTTPS", async () => {
    vi.stubGlobal("document", {});
    vi.stubGlobal("location", { protocol: "http:" });
    await createHassioSession(hass);
    assert.strictEqual(
      global.document.cookie,
      "ingress_session=fhdsu73rh3io4h8f3irhjel8ousafehf8f3yh;path=/api/hassio_ingress/;SameSite=Strict"
    );
  });
  it("Test create session with HTTPS", async () => {
    vi.stubGlobal("document", {});
    vi.stubGlobal("location", { protocol: "https:" });
    await createHassioSession(hass);
    assert.strictEqual(
      global.document.cookie,
      "ingress_session=fhdsu73rh3io4h8f3irhjel8ousafehf8f3yh;path=/api/hassio_ingress/;SameSite=Strict;Secure"
    );
  });
  it("Test fail to create", async () => {
    const createSessionPromise = createHassioSession({
      callWS: async () => {
        throw new Error("Failed to create session");
      },
    }).then(
      () => true,
      () => false
    );
    assert.strictEqual(await createSessionPromise, false);
  });
});
