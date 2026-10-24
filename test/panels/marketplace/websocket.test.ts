import { describe, expect, it, vi } from "vitest";
import {
  addMarketplaceRepository,
  dismissNewMarketplaceRepositories,
  installMarketplaceRepository,
} from "../../../src/data/marketplace/repository";
import {
  ERROR_GITHUB_NOT_CONNECTED,
  isWebSocketError,
  marketplaceErrorMessage,
} from "../../../src/data/marketplace/websocket";
import type { LocalizeFunc } from "../../../src/common/translations/localize";
import type { HomeAssistant } from "../../../src/types";

const mockHass = () =>
  ({ callWS: vi.fn(async () => null) }) as unknown as HomeAssistant;

describe("isWebSocketError", () => {
  it("matches the code of a WebSocket error", () => {
    expect(
      isWebSocketError(
        { code: ERROR_GITHUB_NOT_CONNECTED, message: "Connect GitHub" },
        ERROR_GITHUB_NOT_CONNECTED
      )
    ).toBe(true);
  });

  it("does not match another code", () => {
    expect(
      isWebSocketError({ code: "unknown_error" }, ERROR_GITHUB_NOT_CONNECTED)
    ).toBe(false);
  });

  it.each([null, undefined, "github_not_connected", new Error("boom")])(
    "does not match %s",
    (err) => {
      expect(isWebSocketError(err, ERROR_GITHUB_NOT_CONNECTED)).toBe(false);
    }
  );
});

describe("marketplaceErrorMessage", () => {
  const localize = ((key: string) => key) as LocalizeFunc;

  it("tells the message of the error", () => {
    expect(marketplaceErrorMessage({ message: "Busy" }, localize)).toBe("Busy");
  });

  const ERROR = {
    code: "error",
    message: "Could not install example",
    translation_domain: "marketplace",
    translation_key: "install_failed",
    translation_placeholders: { repository: "example" },
  };

  it("translates the error into the language of the user", () => {
    const translations = ((key: string, values?: Record<string, string>) =>
      key === "component.marketplace.exceptions.install_failed.message"
        ? `Kon ${values!.repository} niet installeren`
        : key) as LocalizeFunc;

    expect(marketplaceErrorMessage(ERROR, translations)).toBe(
      "Kon example niet installeren"
    );
  });

  it("tells the message when the translation is not loaded", () => {
    const missing = (() => "") as unknown as LocalizeFunc;

    expect(marketplaceErrorMessage(ERROR, missing)).toBe(
      "Could not install example"
    );
  });

  it.each([{ code: "unknown_error" }, { message: "" }, null, ""])(
    "falls back to a generic error for %s",
    (err) => {
      expect(marketplaceErrorMessage(err, localize)).toBe(
        "ui.panel.marketplace.common.unknown_error"
      );
    }
  );
});

describe("commands", () => {
  it("adds a custom repository with its category", async () => {
    const hass = mockHass();

    await addMarketplaceRepository(hass, "owner/repo", "plugin");

    expect(hass.callWS).toHaveBeenCalledWith({
      type: "marketplace/repositories/add",
      repository: "owner/repo",
      category: "plugin",
    });
  });

  it("downloads the version the catalog names when none is picked", async () => {
    const hass = mockHass();

    await installMarketplaceRepository(hass, "42");

    expect(hass.callWS).toHaveBeenCalledWith({
      type: "marketplace/repository/install",
      repository: "42",
      version: undefined,
    });
  });

  it("downloads a picked version", async () => {
    const hass = mockHass();

    await installMarketplaceRepository(hass, "42", "v1.0.0");

    expect(hass.callWS).toHaveBeenCalledWith({
      type: "marketplace/repository/install",
      repository: "42",
      version: "v1.0.0",
    });
  });

  it("confirms replacing a built-in integration when asked to", async () => {
    const hass = mockHass();

    await installMarketplaceRepository(hass, "42", "v1.0.0", {
      confirmReplaceBuiltIn: true,
    });

    expect(hass.callWS).toHaveBeenCalledWith({
      type: "marketplace/repository/install",
      repository: "42",
      version: "v1.0.0",
      confirm_replace_built_in: true,
    });
  });

  it("clears new repositories in the active categories", async () => {
    const hass = mockHass();
    await dismissNewMarketplaceRepositories(hass, ["integration", "theme"]);

    expect(hass.callWS).toHaveBeenCalledWith({
      type: "marketplace/repositories/clear_new",
      categories: ["integration", "theme"],
    });
  });
});
