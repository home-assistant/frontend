import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computeLocalize,
  UNKNOWN_PLACEHOLDERS,
} from "../../../src/common/translations/localize";

const localize = () =>
  computeLocalize(document.createElement("div"), "en", {
    en: {
      "component.demo.services.run.description":
        "Runs the {kind} job, see {docs_url}.",
      "component.demo.services.run.name": "Run",
    },
  });

describe("computeLocalize", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the placeholders when the values are not known yet", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    expect(
      (await localize())(
        "component.demo.services.run.description",
        UNKNOWN_PLACEHOLDERS
      )
    ).toBe("Runs the {kind} job, see {docs_url}.");
    expect(
      (await localize())(
        "component.demo.services.run.name",
        UNKNOWN_PLACEHOLDERS
      )
    ).toBe("Run");
    expect(error).not.toHaveBeenCalled();
  });

  it("still reports a missing value as a translation error", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    expect(
      (await localize())("component.demo.services.run.description", {
        kind: "nightly",
      })
    ).toMatch(/^Translation /);
    expect(error).toHaveBeenCalledOnce();
  });
});
