import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NavigateOptions } from "../../src/common/navigate";
import { canGoBack, goBack, navigate } from "../../src/common/navigate";

// navigate() closes open dialogs before touching history.
vi.mock("../../src/dialogs/make-dialog-manager", () => ({
  closeAllDialogs: vi.fn(async () => true),
}));

// Sets up a raw entry the way a document load does, which is exactly what the
// helpers in common/navigate refuse to produce.
const setEntry = (path: string, state: unknown = null) => {
  window.history.replaceState(state, "", path);
};

describe("navigate", () => {
  beforeEach(() => {
    setEntry("/config");
  });

  it("stamps the path we came from on pushed entries", async () => {
    await navigate("/config/devices/dashboard");

    expect(window.location.pathname).toEqual("/config/devices/dashboard");
    expect(window.history.state).toMatchObject({ from: "/config" });
  });

  it("keeps caller data alongside the stamp", async () => {
    await navigate("/config/areas", { data: { scrollPosition: 42 } });

    expect(window.history.state).toMatchObject({
      scrollPosition: 42,
      from: "/config",
    });
  });

  it("ignores caller data that is not an object", async () => {
    await navigate("/config/areas", { data: 42 } as unknown as NavigateOptions);

    expect(window.history.state).toEqual({ from: "/config" });
  });

  it("keeps the stamp when replacing, the predecessor is unchanged", async () => {
    await navigate("/config/cloud");
    await navigate("/config/cloud/account", { replace: true });

    expect(window.location.pathname).toEqual("/config/cloud/account");
    expect(window.history.state).toMatchObject({ from: "/config" });
  });

  it("does not stamp an entry the app did not push", () => {
    expect(window.history.state).toBeNull();
    expect(canGoBack()).toBe(false);
  });
});

describe("goBack", () => {
  beforeEach(() => {
    setEntry("/config/cloud/remote");
    vi.restoreAllMocks();
  });

  it("goes back when we came from another page in the app", async () => {
    const back = vi
      .spyOn(window.history, "back")
      .mockImplementation(() => undefined);
    await navigate("/config/cloud/remote");

    await goBack("/config/cloud/account");

    expect(back).toHaveBeenCalledOnce();
  });

  it("falls back to the given path when the previous entry is not ours", async () => {
    // A login redirect lands on the page through location.assign, leaving
    // /auth/authorize behind: going back there would leave the app.
    const back = vi
      .spyOn(window.history, "back")
      .mockImplementation(() => undefined);

    await goBack("/config/cloud/account");

    expect(back).not.toHaveBeenCalled();
    expect(window.location.pathname).toEqual("/config/cloud/account");
  });

  it("falls back to the root when no path is given", async () => {
    vi.spyOn(window.history, "back").mockImplementation(() => undefined);

    await goBack();

    expect(window.location.pathname).toEqual("/");
  });
});
