import type { ReactiveControllerHost } from "@lit/reactive-element/reactive-controller";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { QueryParamsController } from "../../../src/common/controllers/query-params-controller";
import { fireEvent } from "../../../src/common/dom/fire_event";

const config = { string: ["search", "sort"] } as const;

const createHost = (): ReactiveControllerHost => ({
  addController: vi.fn(),
  removeController: vi.fn(),
  requestUpdate: vi.fn(),
  updateComplete: Promise.resolve(true),
});

const setUrl = (url: string) => window.history.replaceState(null, "", url);

const currentUrl = () => `${window.location.pathname}${window.location.search}`;

describe("QueryParamsController", () => {
  let enabled: boolean;
  let navigated: Mock<() => void>;
  let controller: QueryParamsController<typeof config>;

  beforeEach(() => {
    vi.useFakeTimers();
    setUrl("/page?other=1");
    enabled = true;
    navigated = vi.fn();
    controller = new QueryParamsController(createHost(), config, {
      enabled: () => enabled,
      navigated,
    });
    controller.hostConnected();
  });

  afterEach(() => {
    controller.hostDisconnected();
    vi.useRealTimers();
  });

  it("writes its own params and keeps the others", () => {
    controller.write({ search: "abc", sort: "name" });
    expect(currentUrl()).toBe("/page?other=1&search=abc&sort=name");

    controller.write({});
    expect(currentUrl()).toBe("/page?other=1");
  });

  it("writes a debounced write once typing pauses", () => {
    controller.write({ search: "a" }, true);
    controller.write({ search: "ab" }, true);
    vi.advanceTimersByTime(299);
    expect(currentUrl()).toBe("/page?other=1");

    vi.advanceTimersByTime(1);
    expect(currentUrl()).toBe("/page?other=1&search=ab");
  });

  it("writes a pending write on flush", () => {
    controller.write({ search: "abc" }, true);
    controller.flush();
    expect(currentUrl()).toBe("/page?other=1&search=abc");
  });

  it("lets a later write replace a pending one", () => {
    controller.write({ search: "abc" }, true);
    controller.write({ sort: "name" });
    vi.runAllTimers();
    expect(currentUrl()).toBe("/page?other=1&sort=name");
  });

  it("drops a pending write when navigated", () => {
    controller.write({ search: "abc" }, true);
    window.dispatchEvent(new Event("location-changed"));
    vi.runAllTimers();
    expect(currentUrl()).toBe("/page?other=1");
    expect(navigated).toHaveBeenCalledOnce();
  });

  it("drops a pending write on popstate", () => {
    controller.write({ search: "abc" }, true);
    window.dispatchEvent(new PopStateEvent("popstate"));
    vi.runAllTimers();
    expect(currentUrl()).toBe("/page?other=1");
  });

  it("writes again after a dialog's entry is popped", () => {
    // A write made while a dialog's entry is current, then the dialog closes
    // and the page's own entry comes back with the URL from before
    window.history.replaceState({ dialog: "dialog-box" }, "", "/page?other=1");
    controller.write({ search: "abc" });
    window.history.replaceState(null, "", "/page?other=1");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(currentUrl()).toBe("/page?other=1&search=abc");
    expect(navigated).not.toHaveBeenCalled();

    // Only once: a later pop reads the URL again
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(navigated).toHaveBeenCalledOnce();
  });

  it("writes again for each controller after a dialog's entry is popped", () => {
    // Writes in the opposite order to the listeners, so the first listener's
    // write saw the URL the other changed, and its replay changes the URL the
    // other sees
    const otherNavigated = vi.fn();
    const other = new QueryParamsController(
      createHost(),
      { string: ["label"] },
      { enabled: () => true, navigated: otherNavigated }
    );
    other.hostConnected();

    window.history.replaceState({ dialog: "dialog-box" }, "", "/page?other=1");
    other.write({ label: "a" });
    controller.write({ search: "abc" });
    window.history.replaceState(null, "", "/page?other=1");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(currentUrl()).toBe("/page?other=1&search=abc&label=a");
    expect(navigated).not.toHaveBeenCalled();
    expect(otherNavigated).not.toHaveBeenCalled();

    other.hostDisconnected();
  });

  it("drops a write on a dialog's entry when navigated", () => {
    window.history.replaceState({ dialog: "dialog-box" }, "", "/page?other=1");
    controller.write({ search: "abc" });
    window.history.replaceState(null, "", "/page?search=new");
    window.dispatchEvent(new Event("location-changed"));
    expect(currentUrl()).toBe("/page?search=new");
    expect(navigated).toHaveBeenCalledOnce();
  });

  it("drops a pending write when disconnected", () => {
    controller.write({ search: "abc" }, true);
    controller.hostDisconnected();
    vi.runAllTimers();
    expect(currentUrl()).toBe("/page?other=1");
  });

  it("does nothing once disconnected, also on the same page", () => {
    // A page left while a lookup runs, with a new page on the same path
    controller.hostDisconnected();
    setUrl("/page?search=new");
    controller.write({ search: "old" });
    expect(currentUrl()).toBe("/page?search=new");
    expect(controller.searchParams()).toBeUndefined();
  });

  it("does nothing once the URL is another page", () => {
    setUrl("/other-page?other=1");
    window.dispatchEvent(new Event("location-changed"));
    controller.write({ search: "abc" });
    expect(currentUrl()).toBe("/other-page?other=1");
    expect(controller.searchParams()).toBeUndefined();
    expect(navigated).not.toHaveBeenCalled();
  });

  it("does nothing when not enabled", () => {
    enabled = false;
    controller.write({ search: "abc" });
    expect(currentUrl()).toBe("/page?other=1");
    expect(controller.searchParams()).toBeUndefined();
  });

  it("only tells the host it was navigated to on reconnect after an update", () => {
    controller.hostDisconnected();
    controller.hostConnected();
    expect(navigated).not.toHaveBeenCalled();

    controller.hostUpdated();
    controller.hostDisconnected();
    controller.hostConnected();
    expect(navigated).toHaveBeenCalledOnce();
  });

  it("stays on its page when reconnected on the way to another page", () => {
    controller.hostUpdated();
    controller.hostDisconnected();
    setUrl("/other-page");
    controller.hostConnected();
    controller.write({ search: "abc" });
    expect(currentUrl()).toBe("/other-page");
    expect(navigated).not.toHaveBeenCalled();
  });

  it("follows a router sending its path on to the default page", () => {
    setUrl("/page/dashboard?other=1");
    fireEvent(window, "location-changed", { replace: true });
    expect(navigated).toHaveBeenCalledOnce();

    controller.write({ search: "abc" });
    expect(currentUrl()).toBe("/page/dashboard?other=1&search=abc");
  });

  it("does not follow a new entry for a page below its own", () => {
    setUrl("/page/detail");
    fireEvent(window, "location-changed", { replace: false });
    controller.write({ search: "abc" });
    expect(currentUrl()).toBe("/page/detail");
  });
});
