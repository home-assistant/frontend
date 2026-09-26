import { describe, expect, it } from "vitest";
import {
  createNativeModalDialogUrl,
  decodeNativeModalDialogUrl,
  isNativeModalPath,
} from "../../../src/common/url/native-modal-url";

describe("native modal url", () => {
  it("carries the dialog and its parameters through the fragment", () => {
    const url = createNativeModalDialogUrl({
      tag: "dialog-logbook-detail",
      params: { entry: { when: 1, name: "Sun" } },
    });

    expect(url.startsWith("/modal#dialog=")).toBe(true);
    expect(isNativeModalPath(new URL(url, "http://x").pathname)).toBe(true);
    expect(decodeNativeModalDialogUrl(new URL(url, "http://x").hash)).toEqual({
      tag: "dialog-logbook-detail",
      params: { entry: { when: 1, name: "Sun" } },
    });
  });

  // A set left to JSON arrives as {}, and whatever calls `has` on it throws.
  it("rebuilds a set rather than handing over an empty object", () => {
    const url = createNativeModalDialogUrl({
      tag: "dialog-logbook-detail",
      params: { systemUserIds: new Set(["abc", "def"]) },
    });

    const decoded = decodeNativeModalDialogUrl(new URL(url, "http://x").hash);

    const ids = (decoded!.params as { systemUserIds: Set<string> })
      .systemUserIds;
    expect(ids).toBeInstanceOf(Set);
    expect(ids.has("abc")).toBe(true);
    expect(ids.has("nope")).toBe(false);
  });

  it("escapes a fragment that would otherwise break the url", () => {
    const url = createNativeModalDialogUrl({
      tag: "dialog-logbook-detail",
      params: { name: "a&b #c" },
    });

    expect(decodeNativeModalDialogUrl(new URL(url, "http://x").hash)).toEqual({
      tag: "dialog-logbook-detail",
      params: { name: "a&b #c" },
    });
  });

  it("returns nothing for a fragment it cannot read", () => {
    expect(decodeNativeModalDialogUrl("")).toBeUndefined();
    expect(decodeNativeModalDialogUrl("#other=1")).toBeUndefined();
    expect(decodeNativeModalDialogUrl("#dialog=not-json")).toBeUndefined();
    expect(decodeNativeModalDialogUrl("#dialog=%7B%7D")).toBeUndefined();
  });

  it("matches its own path and nothing else", () => {
    expect(isNativeModalPath("/modal")).toBe(true);
    expect(isNativeModalPath("/modal/")).toBe(true);
    expect(isNativeModalPath("/modal/extra")).toBe(false);
    expect(isNativeModalPath("/more-info")).toBe(false);
  });
});
