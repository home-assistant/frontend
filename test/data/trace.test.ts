import { describe, expect, it } from "vitest";
import { getTraceUrl } from "../../src/data/trace";

// Trace links from the logbook and from trace steps share this URL. Automation
// ids are free-form, and the automation router decodes the path segment, so
// an unencoded "/", "?" or "#" would open the wrong page or drop the run.
describe("getTraceUrl", () => {
  it("links to the run on the trace page of the item", () => {
    expect(
      getTraceUrl({ domain: "script", item_id: "child_a", run_id: "run_1" })
    ).toBe("/config/script/trace/child_a?run_id=run_1");
  });

  it("encodes an automation id so it survives as one path segment", () => {
    const itemId = "kitchen/lights?on#1 %";
    const url = getTraceUrl({
      domain: "automation",
      item_id: itemId,
      run_id: "run_1",
    });

    const parsed = new URL(url, "http://localhost");
    const segment = parsed.pathname.split("/").pop()!;
    expect(parsed.pathname).toBe(
      "/config/automation/trace/kitchen%2Flights%3Fon%231%20%25"
    );
    expect(decodeURIComponent(segment)).toBe(itemId);
    expect(parsed.searchParams.get("run_id")).toBe("run_1");
  });
});
