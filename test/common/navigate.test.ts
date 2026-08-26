import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  NavigateOptions,
  UnsavedChangesGuard,
} from "../../src/common/navigate";
import {
  canGoBack,
  goBack,
  navigate,
  registerUnsavedChangesGuard,
  unregisterUnsavedChangesGuard,
} from "../../src/common/navigate";

// navigate() closes open dialogs before touching history.
vi.mock("../../src/dialogs/make-dialog-manager", () => ({
  closeAllDialogs: vi.fn(async () => true),
}));

// Fabricates a raw entry like a document load, which navigate() never produces.
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

describe("unsaved changes guard", () => {
  const registeredGuards: UnsavedChangesGuard[] = [];

  const registerGuard = (isDirty: boolean, promptResult = true) => {
    const guard = {
      isDirty: vi.fn(() => isDirty),
      prompt: vi.fn(async () => promptResult),
    };
    registerUnsavedChangesGuard(guard);
    registeredGuards.push(guard);
    return guard;
  };

  beforeEach(() => {
    setEntry("/config");
  });

  afterEach(() => {
    registeredGuards.splice(0).forEach(unregisterUnsavedChangesGuard);
  });

  it("navigates without prompting when no guard is dirty", async () => {
    const guard = registerGuard(false);

    expect(await navigate("/config/areas")).toBe(true);

    expect(window.location.pathname).toEqual("/config/areas");
    expect(guard.prompt).not.toHaveBeenCalled();
  });

  it("prompts a dirty guard and navigates when confirmed", async () => {
    const guard = registerGuard(true, true);

    expect(await navigate("/config/areas")).toBe(true);

    expect(guard.prompt).toHaveBeenCalledOnce();
    expect(window.location.pathname).toEqual("/config/areas");
  });

  it("leaves history untouched when the prompt is declined", async () => {
    const guard = registerGuard(true, false);
    const listener = vi.fn();
    window.addEventListener("location-changed", listener);

    expect(await navigate("/config/areas")).toBe(false);

    window.removeEventListener("location-changed", listener);
    expect(guard.prompt).toHaveBeenCalledOnce();
    expect(window.location.pathname).toEqual("/config");
    expect(listener).not.toHaveBeenCalled();
  });

  it("does not prompt when navigating to the current path", async () => {
    const guard = registerGuard(true, false);

    expect(await navigate("/config")).toBe(true);

    expect(guard.prompt).not.toHaveBeenCalled();
  });

  it("skips a pending prompt once no guard is dirty anymore", async () => {
    let dirty = true;
    let resolvePrompt!: (value: boolean) => void;
    const guard: UnsavedChangesGuard = {
      isDirty: () => dirty,
      prompt: vi.fn(
        () =>
          new Promise<boolean>((resolve) => {
            resolvePrompt = resolve;
          })
      ),
    };
    registerUnsavedChangesGuard(guard);
    registeredGuards.push(guard);

    const first = navigate("/config/areas");
    dirty = false;

    expect(await navigate("/config/devices/dashboard")).toBe(true);
    expect(window.location.pathname).toEqual("/config/devices/dashboard");

    resolvePrompt(true);
    expect(await first).toBe(true);
    expect(guard.prompt).toHaveBeenCalledOnce();
  });

  it("shares one pending prompt between concurrent navigations", async () => {
    let resolvePrompt!: (value: boolean) => void;
    const guard: UnsavedChangesGuard = {
      isDirty: () => true,
      prompt: vi.fn(
        () =>
          new Promise<boolean>((resolve) => {
            resolvePrompt = resolve;
          })
      ),
    };
    registerUnsavedChangesGuard(guard);
    registeredGuards.push(guard);

    const first = navigate("/config/areas");
    const second = navigate("/config/devices/dashboard");
    resolvePrompt(true);

    expect(await Promise.all([first, second])).toEqual([true, true]);
    expect(guard.prompt).toHaveBeenCalledOnce();
  });

  it("stops prompting once the guard is unregistered", async () => {
    const guard = registerGuard(true, false);
    unregisterUnsavedChangesGuard(guard);

    expect(await navigate("/config/areas")).toBe(true);

    expect(guard.prompt).not.toHaveBeenCalled();
  });

  it("does not prompt for goBack's fallback navigation", async () => {
    const guard = registerGuard(true, false);

    await goBack("/config/cloud/account");

    expect(window.location.pathname).toEqual("/config/cloud/account");
    expect(guard.prompt).not.toHaveBeenCalled();
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
