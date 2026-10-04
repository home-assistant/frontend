import { describe, expect, it, vi } from "vitest";

import { isNavigationClick } from "../../../src/common/dom/is-navigation-click";

const createAnchor = (
  href: string,
  attributes: Record<string, string> = {}
): HTMLAnchorElement => {
  const anchor = document.createElement("a");
  anchor.href = href;
  for (const [name, value] of Object.entries(attributes)) {
    anchor.setAttribute(name, value);
  }
  return anchor;
};

const clickEvent = (
  anchor: HTMLAnchorElement,
  overrides: Partial<MouseEvent> = {}
): MouseEvent =>
  ({
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    composedPath: () => [anchor],
    preventDefault: vi.fn(),
    ...overrides,
  }) as unknown as MouseEvent;

describe("isNavigationClick", () => {
  it("returns the path for same-origin links", () => {
    expect(
      isNavigationClick(clickEvent(createAnchor(`${location.origin}/config`)))
    ).toEqual("/config");
    expect(
      isNavigationClick(
        clickEvent(createAnchor(`${location.origin}/energy?historyBack=1`))
      )
    ).toEqual("/energy?historyBack=1");
    expect(
      isNavigationClick(
        clickEvent(createAnchor(`${location.origin}/config/areas#section`))
      )
    ).toEqual("/config/areas#section");
  });

  it("does not intercept a link on a different port", () => {
    // The current origin has no port, so a ported URL shares its string prefix
    // but is a different origin — it must not be treated as internal.
    expect(
      isNavigationClick(clickEvent(createAnchor(`${location.origin}:8123/`)))
    ).toBeUndefined();
  });

  it("does not intercept a host that merely starts with the origin", () => {
    expect(
      isNavigationClick(
        clickEvent(createAnchor(`${location.origin}.example.com/`))
      )
    ).toBeUndefined();
  });

  it("does not intercept other origins", () => {
    expect(
      isNavigationClick(clickEvent(createAnchor("https://example.com/")))
    ).toBeUndefined();
  });

  it("calls preventDefault for intercepted navigations", () => {
    const event = clickEvent(createAnchor(`${location.origin}/config`));
    isNavigationClick(event);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("does not preventDefault when disabled", () => {
    const event = clickEvent(createAnchor(`${location.origin}/config`));
    expect(isNavigationClick(event, false)).toEqual("/config");
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("ignores clicks with a target, download, or rel=external", () => {
    expect(
      isNavigationClick(
        clickEvent(
          createAnchor(`${location.origin}/config`, { target: "_blank" })
        )
      )
    ).toBeUndefined();
    expect(
      isNavigationClick(
        clickEvent(createAnchor(`${location.origin}/config`, { download: "" }))
      )
    ).toBeUndefined();
    expect(
      isNavigationClick(
        clickEvent(
          createAnchor(`${location.origin}/config`, { rel: "external" })
        )
      )
    ).toBeUndefined();
  });

  it("ignores modified clicks and non-left buttons", () => {
    const anchor = createAnchor(`${location.origin}/config`);
    expect(
      isNavigationClick(clickEvent(anchor, { button: 1 }))
    ).toBeUndefined();
    expect(
      isNavigationClick(clickEvent(anchor, { metaKey: true }))
    ).toBeUndefined();
    expect(
      isNavigationClick(clickEvent(anchor, { ctrlKey: true }))
    ).toBeUndefined();
    expect(
      isNavigationClick(clickEvent(anchor, { shiftKey: true }))
    ).toBeUndefined();
    expect(
      isNavigationClick(clickEvent(anchor, { defaultPrevented: true }))
    ).toBeUndefined();
  });

  it("ignores mailto links and clicks without an anchor", () => {
    expect(
      isNavigationClick(clickEvent(createAnchor("mailto:test@example.com")))
    ).toBeUndefined();
    expect(
      isNavigationClick(
        clickEvent(undefined as any, {
          composedPath: () => [document.createElement("div")],
        })
      )
    ).toBeUndefined();
  });
});
