import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  NavigateOptions,
  UnsavedChangesGuard,
} from "../../src/common/navigate";
import {
  canGoBack,
  goBack,
  handleHistoryPop,
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

const registeredGuards: UnsavedChangesGuard[] = [];

// Registering through this keeps the cleanup able to reach the module-level
// registry, which outlives the test that filled it.
const trackGuard = <T extends UnsavedChangesGuard>(guard: T): T => {
  registerUnsavedChangesGuard(guard);
  registeredGuards.push(guard);
  return guard;
};

const registerGuard = (isDirty: boolean, promptResult = true) =>
  trackGuard({
    isDirty: vi.fn(() => isDirty),
    prompt: vi.fn(async () => promptResult),
  });

// A guard whose prompt stays open until the test answers it.
const trackDeferredGuard = (isDirty: () => boolean = () => true) => {
  let answer!: (value: boolean) => void;
  const guard = trackGuard({
    isDirty,
    prompt: vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          answer = resolve;
        })
    ),
  });
  return { guard, answerPrompt: (value: boolean) => answer(value) };
};

afterEach(() => {
  registeredGuards.splice(0).forEach(unregisterUnsavedChangesGuard);
});

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
  beforeEach(() => {
    setEntry("/config");
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
    const { guard, answerPrompt } = trackDeferredGuard(() => dirty);

    const first = navigate("/config/areas");
    dirty = false;

    expect(await navigate("/config/devices/dashboard")).toBe(true);
    expect(window.location.pathname).toEqual("/config/devices/dashboard");
    expect(guard.prompt).toHaveBeenCalledOnce();

    answerPrompt(true);
    await first;
  });

  it("drops a navigation superseded while its prompt was open", async () => {
    let dirty = true;
    const { answerPrompt } = trackDeferredGuard(() => dirty);

    const superseded = navigate("/config/areas");
    dirty = false;
    await navigate("/config/devices/dashboard");

    answerPrompt(true);

    expect(await superseded).toBe(false);
    expect(window.location.pathname).toEqual("/config/devices/dashboard");
  });

  it("shares one pending prompt between concurrent navigations", async () => {
    const { guard, answerPrompt } = trackDeferredGuard(() => true);

    const first = navigate("/config/areas");
    const second = navigate("/config/devices/dashboard");
    answerPrompt(true);

    await Promise.all([first, second]);

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

describe("handleHistoryPop", () => {
  // What the browser leaves behind before the router hears about a pop.
  const pop = (path: string, from = "/config") => {
    window.history.replaceState({ from }, "", path);
    const resume = vi.fn();
    handleHistoryPop(resume);
    return resume;
  };

  // The editor is pushed from the dashboard, so the entry behind it is BACK and
  // any entry ahead of it records the editor as its own `from`.
  const EDITOR = "/config/automation/edit/1";
  const BACK = "/config/automation/dashboard";
  const popForward = (path: string) => pop(path, EDITOR);

  // Lets the answered prompt's continuation run, so "did not act" is assertable.
  const flush = () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve);
    });

  let go: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.restoreAllMocks();
    go = vi.spyOn(window.history, "go").mockImplementation(() => undefined);
    vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    // Seed the tracked entry the way the app does.
    setEntry("/config/automation/dashboard");
    await navigate("/config/automation/edit/1");
  });

  it("routes a pop when nothing is dirty", () => {
    const guard = registerGuard(false);

    expect(pop(BACK)).toHaveBeenCalledOnce();
    expect(guard.prompt).not.toHaveBeenCalled();
  });

  it("holds the route and prompts on a pop away from a dirty page", async () => {
    const guard = registerGuard(true, false);

    const resume = pop(BACK);

    await vi.waitFor(() => expect(guard.prompt).toHaveBeenCalledOnce());
    await flush();
    expect(resume).not.toHaveBeenCalled();
  });

  it("does not prompt for a pop that stays on the same path", () => {
    const guard = registerGuard(true, false);

    // A dialog closing pops its own entry without changing the URL.
    expect(pop("/config/automation/edit/1")).toHaveBeenCalledOnce();
    expect(guard.prompt).not.toHaveBeenCalled();
  });

  it("guards a forward traversal and declines it backwards", async () => {
    const guard = registerGuard(true, false);

    const resume = popForward("/history");

    await vi.waitFor(() => expect(guard.prompt).toHaveBeenCalledOnce());
    expect(resume).not.toHaveBeenCalled();
    // Undoing a forward means going back, not forward again.
    await vi.waitFor(() => expect(go).toHaveBeenCalledWith(-1));
  });

  it("reads a pop as back when both neighbours share a path", async () => {
    const guard = registerGuard(true, false);

    // editor -> dashboard -> editor: the dashboard is both the entry behind us
    // and, by path, one that could be ahead. Treating it as forward would leave
    // a real back press unguarded.
    const resume = pop(BACK, EDITOR);

    await vi.waitFor(() => expect(guard.prompt).toHaveBeenCalledOnce());
    expect(resume).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(go).toHaveBeenCalledWith(1));
  });

  it("does not reload when the held pops cancel out", async () => {
    const { guard, answerPrompt } = trackDeferredGuard();

    pop(BACK);
    await vi.waitFor(() => expect(guard.prompt).toHaveBeenCalledOnce());
    // Forward again while the prompt is up, back to where we started.
    pop(EDITOR, BACK);

    answerPrompt(false);
    await flush();

    // go(0) would reload the document and lose the edits it just protected.
    expect(go).not.toHaveBeenCalled();
  });

  it("does not guard a jump over several entries", async () => {
    const guard = registerGuard(true, false);

    // A long press on back skips past the entry the editor came from.
    expect(pop("/config")).toHaveBeenCalledOnce();

    await flush();
    expect(guard.prompt).not.toHaveBeenCalled();
    expect(go).not.toHaveBeenCalled();
  });

  it("routes once when the prompt is confirmed", async () => {
    registerGuard(true, true);

    const resume = pop(BACK);

    await vi.waitFor(() => expect(resume).toHaveBeenCalledOnce());
    expect(go).not.toHaveBeenCalled();
  });

  it("returns to the page when the prompt is declined", async () => {
    registerGuard(true, false);

    const resume = pop(BACK);

    await vi.waitFor(() => expect(go).toHaveBeenCalledWith(1));
    expect(resume).not.toHaveBeenCalled();
  });

  it("undoes every pop taken while the prompt was open", async () => {
    const { guard, answerPrompt } = trackDeferredGuard();

    pop(BACK);
    await vi.waitFor(() => expect(guard.prompt).toHaveBeenCalledOnce());
    // Impatient second back press while the prompt is still up.
    const resume = pop("/config");

    answerPrompt(false);

    await vi.waitFor(() => expect(go).toHaveBeenCalledWith(2));
    expect(guard.prompt).toHaveBeenCalledOnce();
    expect(resume).not.toHaveBeenCalled();
  });

  it("does not count a held pop it cannot account for", async () => {
    const { guard, answerPrompt } = trackDeferredGuard();

    pop(BACK);
    await vi.waitFor(() => expect(guard.prompt).toHaveBeenCalledOnce());
    // Cannot be undone, so it must not inflate what declining restores.
    pop("/history");

    answerPrompt(false);

    await vi.waitFor(() => expect(go).toHaveBeenCalledWith(1));
  });

  it("tracks the entry it loaded on, so a pop after a reload is guarded", async () => {
    // A reload keeps the entry's state but re-evaluates the module, so the
    // entry has to be read at init rather than left with no `from`.
    vi.resetModules();
    setEntry(EDITOR, { from: BACK });
    const fresh = await import("../../src/common/navigate");
    const guard = { isDirty: () => true, prompt: vi.fn(async () => false) };
    fresh.registerUnsavedChangesGuard(guard);

    window.history.replaceState({ from: "/config" }, "", BACK);
    const resume = vi.fn();
    fresh.handleHistoryPop(resume);

    await vi.waitFor(() => expect(guard.prompt).toHaveBeenCalledOnce());
    expect(resume).not.toHaveBeenCalled();
    fresh.unregisterUnsavedChangesGuard(guard);
  });

  it("does not prompt for the pop goBack asked for", async () => {
    const guard = registerGuard(true, false);

    await goBack();

    expect(pop(BACK)).toHaveBeenCalledOnce();
    expect(guard.prompt).not.toHaveBeenCalled();
  });

  it("drops a pop once a navigation has moved the app on", async () => {
    let dirty = true;
    const { guard, answerPrompt } = trackDeferredGuard(() => dirty);

    const resume = pop(BACK);
    await vi.waitFor(() => expect(guard.prompt).toHaveBeenCalledOnce());
    // The prompt's save action can clean the page and navigate on its own.
    dirty = false;
    await navigate("/config/areas");

    answerPrompt(true);
    await flush();

    expect(resume).not.toHaveBeenCalled();
    expect(window.location.pathname).toEqual("/config/areas");
  });

  it("shares one prompt with a navigation, and the pop wins", async () => {
    const { guard, answerPrompt } = trackDeferredGuard();

    // The back press opens the prompt, so it is the one that gets answered.
    const resume = pop(BACK);
    await vi.waitFor(() => expect(guard.prompt).toHaveBeenCalledOnce());
    const navigation = navigate("/config/areas");

    answerPrompt(true);

    expect(await navigation).toBe(false);
    expect(resume).toHaveBeenCalledOnce();
    expect(window.location.pathname).toEqual("/config/automation/dashboard");
  });
});
