import { describe, expect, it, vi } from "vitest";
import type { MarketplaceData } from "../../../src/data/marketplace/marketplace";
import { repositoryDownloadVersion } from "../../../src/data/marketplace/repository";
import {
  ERROR_GITHUB_NOT_CONNECTED,
  ERROR_WARNING_NOT_ACCEPTED,
  handleWarningNotAccepted,
  isWebSocketError,
  repositoriesClearNew,
  repositoryAdd,
} from "../../../src/data/marketplace/websocket";
import type { HomeAssistant } from "../../../src/types";

const mockHass = () =>
  ({
    connection: { sendMessagePromise: vi.fn(async () => null) },
  }) as unknown as HomeAssistant;

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

describe("handleWarningNotAccepted", () => {
  it("asks the panel to refresh, so it shows the warning screen", () => {
    const refresh = vi.fn();
    window.addEventListener("marketplace-refresh", refresh);

    expect(handleWarningNotAccepted({ code: ERROR_WARNING_NOT_ACCEPTED })).toBe(
      true
    );

    window.removeEventListener("marketplace-refresh", refresh);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("leaves other errors to the caller", () => {
    const refresh = vi.fn();
    window.addEventListener("marketplace-refresh", refresh);

    expect(handleWarningNotAccepted({ code: "unknown_error" })).toBe(false);

    window.removeEventListener("marketplace-refresh", refresh);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("commands", () => {
  it("adds a custom repository with its category", async () => {
    const hass = mockHass();

    await repositoryAdd(hass, "owner/repo", "plugin");

    expect(hass.connection.sendMessagePromise).toHaveBeenCalledWith({
      type: "marketplace/repositories/add",
      repository: "owner/repo",
      category: "plugin",
    });
  });

  it("downloads the version the catalog names when none is picked", async () => {
    const hass = mockHass();

    await repositoryDownloadVersion(hass, "42");

    expect(hass.connection.sendMessagePromise).toHaveBeenCalledWith({
      type: "marketplace/repository/download",
      repository: "42",
      version: undefined,
    });
  });

  it("downloads a picked version", async () => {
    const hass = mockHass();

    await repositoryDownloadVersion(hass, "42", "v1.0.0");

    expect(hass.connection.sendMessagePromise).toHaveBeenCalledWith({
      type: "marketplace/repository/download",
      repository: "42",
      version: "v1.0.0",
    });
  });

  it("clears new repositories in the active categories", async () => {
    const hass = mockHass();
    const marketplace = {
      info: { categories: ["integration", "theme"] },
    } as unknown as MarketplaceData;

    await repositoriesClearNew(hass, marketplace);

    expect(hass.connection.sendMessagePromise).toHaveBeenCalledWith({
      type: "marketplace/repositories/clear_new",
      categories: ["integration", "theme"],
    });
  });
});
