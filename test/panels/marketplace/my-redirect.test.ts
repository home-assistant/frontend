import { afterEach, describe, expect, it, vi } from "vitest";
import { navigate } from "../../../src/common/navigate";
import type * as NavigateModule from "../../../src/common/navigate";
import "../../../src/panels/marketplace/ha-marketplace-my-redirect";
import { getMyRedirects } from "../../../src/panels/my/ha-panel-my";
import { provideHass } from "../../../src/fake_data/provide_hass";

vi.mock("../../../src/common/navigate", async (importOriginal) => ({
  ...(await importOriginal<typeof NavigateModule>()),
  navigate: vi.fn(),
}));

// The real error screen needs more browser than jsdom has, only what the
// redirect hands it matters here.
vi.mock("../../../src/layouts/hass-error-screen", () => {
  customElements.define(
    "hass-error-screen",
    class extends HTMLElement {
      public error?: string;
    }
  );
  return {};
});

// What "Open in HACS" badges on repository READMEs link to
const BADGE_PARAMS = "?owner=hacs-test-org&repository=integration-basic";

const openRedirect = async (redirect: string, search: string) => {
  window.history.replaceState(
    null,
    "",
    `/marketplace/_my_redirect/${redirect}${search}`
  );
  const host = document.createElement("div");
  provideHass(host, { localize: (key: string) => key });
  document.body.appendChild(host);
  const element = document.createElement("ha-marketplace-my-redirect");
  element.route = {
    prefix: "/marketplace/_my_redirect",
    path: `/${redirect}`,
  };
  host.appendChild(element);
  await element.updateComplete;
  return element;
};

describe("my links", () => {
  // The old name stays, "Open in HACS" badges out there still use it.
  it.each(["hacs_repository", "marketplace_repository"])(
    "sends %s to the Marketplace under the same name",
    (redirect) => {
      expect(getMyRedirects()[redirect]).toEqual({
        component: "marketplace",
        redirect: `/marketplace/_my_redirect/${redirect}`,
        params: {
          owner: "string",
          repository: "string",
          category: "string?",
        },
      });
    }
  );
});

describe("ha-marketplace-my-redirect", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.mocked(navigate).mockClear();
  });

  it.each(["hacs_repository", "marketplace_repository"])(
    "opens the repository of a %s link",
    async (redirect) => {
      await openRedirect(redirect, BADGE_PARAMS);

      expect(navigate).toHaveBeenCalledWith(
        `/marketplace/repository${BADGE_PARAMS}`,
        { replace: true }
      );
    }
  );

  it("keeps the category of a link", async () => {
    await openRedirect(
      "hacs_repository",
      `${BADGE_PARAMS}&category=integration`
    );

    expect(navigate).toHaveBeenCalledWith(
      `/marketplace/repository${BADGE_PARAMS}&category=integration`,
      { replace: true }
    );
  });

  it("shows an error for a link without a repository", async () => {
    const element = await openRedirect(
      "hacs_repository",
      "?owner=hacs-test-org"
    );

    expect(navigate).not.toHaveBeenCalled();
    expect(element.shadowRoot!.querySelector("hass-error-screen")?.error).toBe(
      "ui.panel.marketplace.my.error"
    );
  });

  it("shows an error for a link it does not know", async () => {
    const element = await openRedirect("unknown", BADGE_PARAMS);

    expect(navigate).not.toHaveBeenCalled();
    expect(
      element.shadowRoot!.querySelector("hass-error-screen")
    ).not.toBeNull();
  });
});

describe("the integration page of HACS", () => {
  it.each([
    { name: "hacs", domain: "hacs", url: "?domain=marketplace" },
    { name: "any other", domain: "hue", url: "?domain=hue" },
  ])("opens the Marketplace for $name", ({ domain, url }) => {
    window.history.replaceState(
      null,
      "",
      `/_my_redirect/integration?domain=${domain}`
    );
    const panel = document.createElement("ha-panel-my") as unknown as Record<
      string,
      any
    >;
    panel._redirect = getMyRedirects().integration;

    expect(panel._createRedirectUrl()).toBe(
      `/config/integrations/integration${url}`
    );
    window.history.replaceState(null, "", "/");
  });
});
