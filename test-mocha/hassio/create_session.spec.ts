import * as assert from "assert";
import { createHassioSession } from "../../src/data/hassio/supervisor";

const sessionID = "fhdsu73rh3io4h8f3irhjel8ousafehf8f3yh";

describe("Create hassio session", function () {
  it("Check session without HTTPS", async function () {
    // @ts-ignore
    global.document = {};
    // @ts-ignore
    global.location = {};
    await createHassioSession({
      // @ts-ignore
      callApi: async function () {
        return { data: { session: sessionID } };
      },
    });
    assert.deepEqual(
      // @ts-ignore
      global.document.cookie,
      "ingress_session=fhdsu73rh3io4h8f3irhjel8ousafehf8f3yh;path=/api/hassio_ingress/;SameSite=Strict"
    );
  });
  it("Check session with HTTPS", async function () {
    // @ts-ignore
    global.document = {};
    // @ts-ignore
    global.location = { protocol: "https:" };
    await createHassioSession({
      // @ts-ignore
      callApi: async function () {
        return { data: { session: sessionID } };
      },
    });
    assert.deepEqual(
      // @ts-ignore
      global.document.cookie,
      "ingress_session=fhdsu73rh3io4h8f3irhjel8ousafehf8f3yh;path=/api/hassio_ingress/;SameSite=Strict;Secure"
    );

    // Clean up in case they will be used in other tests
    // @ts-ignore
    global.document = {};
    // @ts-ignore
    global.location = {};
  });
});
